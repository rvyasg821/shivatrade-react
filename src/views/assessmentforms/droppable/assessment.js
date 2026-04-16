// ** React Imports
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import editIcon from "../../../assets/images/svg/edit.svg"
import deleteIcon from "../../../assets/images/svg/delete.svg"
import { Card, CardHeader, CardTitle } from "reactstrap";
import { appsRoot } from "../../../constants/defaultValues";
import { useTranslation } from "react-i18next";
const DroppableComp = ({
  questionItems,
  handleEditSection,
  handleDeleteSection,
  handleOnDragEnd,
  handleDeleteQuestion,
  handleDragSections
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
const { t } = useTranslation();
  return (
    <DragDropContext onDragEnd={handleDragSections}>
      <Droppable droppableId="droppable-sections" type="SECTION">
        {(provided) => (

          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="sections-container"
          >
            {questionItems.map((item, sectionIndex) => {
              const sectionId = item._id?.toString();
              return (
                <Draggable
                  key={sectionId}
                  draggableId={sectionId}
                  index={sectionIndex}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="section col-input assesment-main-que"
                    >
                      <Card className="question-card">
                        <CardHeader className="row p-1">
                          <CardTitle tag="h4" className="mb-0 title col-sm-5">
                            {item.section_name}
                          </CardTitle>
                          <div className="main-icon-td d-flex align-items-center justify-content-end gap-2 mt-2 mt-sm-0 col-sm-7">
                            <img
                              alt="Edit"
                              title="Edit"
                              src={editIcon}
                              height={20}
                              className="cursor-pointer"
                              onClick={() => handleEditSection(item)}
                            />

                            <img
                              alt="Delete"
                              title="Delete"
                              src={deleteIcon}
                              height={19}
                              className="cursor-pointer"
                              onClick={() => handleDeleteSection(item?._id)}
                            />

                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() =>
                                navigate(
                                  `${appsRoot}/assessment-forms/questions/add?assessmentId=${id}`,
                                  {
                                    state: {
                                      sectionId: item?._id
                                    }
                                  })
                              }
                            >
                              {t('Add Question')}
                            </button>
                          </div>
                        </CardHeader>
                        <div className="separator" />
                        {item.questions?.length > 0 ? (
                          <div className="assesment-data-list table-responsive">
                            <DragDropContext onDragEnd={handleOnDragEnd}>
                              <Droppable
                                type="QUESTION"
                                droppableId={`droppable-${sectionIndex}`}
                              >
                                {(provided) => (
                                  <table
                                    className="table table-borderless"
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                  >
                                    <tbody>
                                      {item.questions.map(
                                        (question, questionIndex) => (
                                          <Draggable
                                            key={question._id}
                                            draggableId={question._id}
                                            index={questionIndex}
                                          >
                                            {(provided) => (
                                              <tr
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                              >
                                                <td className="question-td">
                                                  {question.question}
                                                  {question?.child_questions
                                                    ?.length > 0 ? (
                                                    <div>
                                                      {question?.child_questions?.map(
                                                        (Queitem, index) => {
                                                          return (
                                                            <div
                                                              key={Queitem._id}
                                                              className="mt-1"
                                                            >
                                                            
                                                              <span>
                                                                {`(${index + 1}) ${Queitem.question}`}
                                                              </span>
                                                            </div>
                                                          );
                                                        }
                                                      )}
                                                    </div>
                                                  ) : null}
                                                </td>

                                                <td className="type-td">
                                                  {question.option_type}
                                                  {question?.child_questions
                                                    ?.length > 0 ? (
                                                    <div>
                                                      {question?.child_questions?.map(
                                                        (Queitem, index) => {
                                                          return (
                                                            <div
                                                              key={Queitem._id}
                                                              className="mt-1"
                                                            >
                                                             
                                                              <span>
                                                                {`(${index + 1}) ${Queitem.option_type}`}
                                                              </span>
                                                            </div>
                                                          )
                                                        }
                                                      )}
                                                    </div>
                                                  ) : null}
                                                </td>

                                                <td className="main-icon-td">
                                                  <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
                                                    <img
                                                      alt="Edit"
                                                      height={20}
                                                      title="Edit"
                                                      src={editIcon}
                                                      className="cursor-pointer mr-2"
                                                      onClick={() => {
                                                        navigate(
                                                          `${appsRoot}/assessment-forms/questions/edit/${question?._id}?assessmentId=${id}`
                                                        );
                                                      }}
                                                    />

                                                    <img
                                                      alt="Delete"
                                                      title="Delete"
                                                      src={deleteIcon}
                                                      height={19}
                                                      className="cursor-pointer"
                                                      onClick={() => handleDeleteQuestion(question?._id)}
                                                    />
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </Draggable>
                                        )
                                      )}
                                      {provided.placeholder}
                                    </tbody>
                                  </table>
                                )}
                              </Droppable>
                            </DragDropContext>
                          </div>
                        ) : null}
                      </Card>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}

export default DroppableComp;
