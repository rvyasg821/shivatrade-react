import { Button, Card, CardBody, Col, Row } from "reactstrap";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import DroppableComp from "../droppable/assessment";
import AddSectionModel from "../model/AddSectionModel";
import { bulkOrderUpdate, deleteQuestion, deleteSection, getSectionByQuestions, updateSectionsOrder } from "./questionStore";
import withReactContent from "sweetalert2-react-content";
import { useTranslation } from "react-i18next";
import { startLoading, stopLoading } from "../../loadingstore";
import { useNavigate } from "react-router-dom";
import { appsRoot } from "../../../constants/defaultValues";

const initialValues = { name: "", description: "", status: 1, };

const AssessmentQuestion = ({ childFunc, triggered, cancelTrigger, id }) => {
  const dispatch = useDispatch();
  const mySwal = withReactContent(Swal);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sectionStore = useSelector((state) => state.SectionAssessment);
  const [openModel, setOpenModel] = useState(false);
  const [questionItems, setQuestionsItems] = useState([]);

  const [isEditing, setIsEditing] = useState(false);

  const [initSectionValues, setInitialSectionValues] =
    useState(initialValues);
  const [title, setTitle] = useState("");

  const closePopup = () => {
    setOpenModel(() => false);
  };

  useEffect(() => {
    if (id) {
      dispatch(getSectionByQuestions(id))
    }
  }, [id])

  useEffect(() => {
    if (sectionStore?.sectionItems && Array.isArray(sectionStore.sectionItems)) {
      const formattedSections = sectionStore.sectionItems.map(section => ({
        _id: section._id,
        section_name: section.section_name,
        section_description: section.section_description,
        section_order: section.section_order,
        questions: section.questions || []
      }));
      setQuestionsItems(formattedSections);
    }
  }, [sectionStore?.sectionItems]);

  const handleEditSection = (item) => {
    setIsEditing(() => true);
    setTitle(() => "Edit Section");
    setInitialSectionValues({
      _id: item._id,
      name: item.section_name,
      description: item.section_description,
      order: item.section_order,
      status: item.status ?? 1
    });
    setOpenModel(true);
  };

  const handleAddSection = () => {
    setIsEditing(() => false);
    setTitle(() => "ADD SECTION");
    setInitialSectionValues(initialValues);
    setOpenModel(true);
  };

  useEffect(() => {
    if (triggered) {
      // eslint-disable-next-line
      childFunc.current = handleAddSection();
      cancelTrigger();
    }
    // eslint-disable-next-line
  }, [childFunc, triggered, cancelTrigger, handleAddSection]);

  const handleOnDragEnd = (result) => {

    const { destination, source, draggableId } = result;
    if (!destination || destination.index === source.index) return;

    const sectionIndex = questionItems.findIndex((item) =>
      item.questions.some((question) => question._id === draggableId)
    );
    if (sectionIndex === -1) {

      return;
    }

    const updatedItems = [...questionItems];

    const section = { ...updatedItems[sectionIndex] };
    section.questions = [...section.questions];

    const [movedQuestion] = section.questions.splice(source.index, 1);

    section.questions.splice(destination.index, 0, movedQuestion);

    const updatedPayload = section.questions.map((item, index) => ({
      _id: item._id,
      order: index,
    }));

    updatedItems[sectionIndex] = section;

    const payload = {
      bulkItems: updatedPayload,
      questionOrder: true,
      sectionOrder: false
    };
    setQuestionsItems(() => updatedItems);
    dispatch(bulkOrderUpdate(payload)).then(() => {
    })
  };

  const handleDragSections = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.index === source.index) return;
    const movedSectionIndex = questionItems.findIndex(
      (section) => section._id === draggableId
    );

    if (movedSectionIndex === -1) {
      return;
    }

    const updatedSections = [...questionItems];
    const [movedSection] = updatedSections.splice(movedSectionIndex, 1);
    updatedSections.splice(destination.index, 0, movedSection);

    const updatedPayload = updatedSections.map((section, index) => ({
      sectionId: section._id,
      order: index
    }));
    setQuestionsItems(() => updatedSections);
    const payload = {
      sections: updatedPayload,
    };
    dispatch(updateSectionsOrder({ assessmentId: id, payload })).then(() => {
    })
  }

  const handleDeleteQuestion = (deleteQID) => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t("You won't be able to revert this!"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Yes, delete it!"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-danger ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (result.isConfirmed) {
          dispatch(deleteQuestion(deleteQID)).then(() => {
            dispatch(getSectionByQuestions(id))
          });
        }
      });
  };

  const handleDeleteSection = async (deleteSId) => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t("You won't be able to revert this!"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Yes, delete it!"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-danger ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (result.isConfirmed) {
          dispatch(deleteSection(deleteSId)).then(() => {
            dispatch(getSectionByQuestions(id))
          })
        }
      });
  }

  useEffect(() => {
    if (sectionStore?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [sectionStore?.loading, dispatch]);

  return (
    <Card>
      <Row>
        <Col>
          <CardBody>
            {questionItems?.length === 0 && (
              <></>
            )}
            {questionItems?.length > 0 && (
              <DroppableComp
                questionItems={questionItems}
                handleEditSection={handleEditSection}
                handleDeleteSection={handleDeleteSection}
                handleOnDragEnd={handleOnDragEnd}
                handleDeleteQuestion={handleDeleteQuestion}
                handleDragSections={handleDragSections}
              />
            )}
            <div className="d-flex gap-2 mt-2">
              <Button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate(`${appsRoot}/assessment-forms/edit/${id}`, {
                  state: { goToFirstTabs: true }
                })}
              >
                {t("Previous")}
              </Button>
              <Button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/apps/assessment-forms")}
              >
                {t("Back")}
              </Button>
            </div>
          </CardBody>
        </Col>
      </Row>

      {openModel && (
        <AddSectionModel
          show={openModel}
          closePopup={closePopup}
          title={title}
          isEditing={isEditing}
          initialValues={initSectionValues}
          id={id}
        />

      )}
    </Card>
  )
}

export default AssessmentQuestion;
