// ** React Imports
import React from "react";

// ** Store & Actions
import { useDispatch } from "react-redux";
import { createRole, updateRole } from "../store";
import { useNavigate } from 'react-router-dom'

// ** Reactstrap Imports
import {
    Form,
    Modal,
    Input,
    Label,
    Button,
    Spinner,
    ModalBody,
    ModalHeader,
    FormFeedback
} from "reactstrap";

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup";
import { appsRoot } from "@constant/defaultValues";

// ** Third Party Components
import { useTranslation } from 'react-i18next';

const ModalAddRole = ({
    open,
    closeModal,
    loading,
    roleItemData
}) => { 
    
    // ** Hooks
    const { t } = useTranslation()

    // ** Store vars
    const dispatch = useDispatch()
    const navigate = useNavigate()

    /* Yup validation schema */
    const RoleSchema = yup.object().shape({
        name: yup.string().required(`${t("Name is required")}.`),
        description: yup.string().nullable()
    })

    const {
        reset,
        control,
        handleSubmit,
        formState: { errors }
    } = useForm({
        mode: "all",
        defaultValues: roleItemData,
        resolver: yupResolver(RoleSchema)
    })

    const handleModalOpened = () => {
        reset(roleItemData)
    }

    const handleModalClosed = () => {
        reset(roleItemData)
    }

    const handleReset = () => {
        closeModal()
    }

    const onSubmit = (values) => {
  if (values) {
    const roleData = {
      name: values?.name || "",
      description: values?.description || "",
      type: "system",        // 👈 ensure type is always set
      permissions: {}        // 👈 API expects object, not array
    }

    // If permissions come from form and are valid, merge them
    if (values?.permissions && typeof values.permissions === "object" && !Array.isArray(values.permissions)) {
      roleData.permissions = values.permissions
    }

    if (values?._id) {
      dispatch(updateRole({ id: values._id, data: roleData }))
    } else {
                dispatch(createRole(roleData))
                    .unwrap()
                    .then((res) => {
                        const roleId = res?.roleItem?._id;
                        if (!roleId) return;
                        navigate(`${appsRoot}/roles/permission/${roleId}`)
                    })
            }
  }
}

    return (
        <div className="disabled-backdrop-modal">
            <Modal
                isOpen={open}
                backdrop="static"
                toggle={handleReset}
                onOpened={handleModalOpened}
                onClosed={handleModalClosed}
                className="modal-dialog-centered modal-dialog-case"
            >
                <ModalHeader tag="div" toggle={handleReset}>
                    <h4 className="text-center">
                        {roleItemData?._id ? t("Edit Role") : t("Add Role")}
                    </h4>
                </ModalHeader>

                <ModalBody>
                    <Form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
                        <div className='mb-2'>
                            <Label className='form-label' for='name'>
                                {t("Name")}
                            </Label>
                            <Controller
                                id="name"
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        autoComplete="off"
                                        invalid={!!errors.name}
                                    />
                                )}
                            />
                            <FormFeedback>{errors.name?.message}</FormFeedback>
                        </div>

                        <div className='mb-2'>
                            <Label className='form-label' for='description'>
                                {t("Description")}
                            </Label>
                            <Controller
                                id="description"
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        type="textarea"
                                        autoComplete="off"
                                        invalid={!!errors.description}
                                    />
                                )}
                            />
                            <FormFeedback>{errors.description?.message}</FormFeedback>
                        </div>

                        <div className="modal-bottom-btn d-flex justify-content-end mt-4 mb-2">
                            <Button type="submit" color="primary" className="mx-2" disabled={loading}>
                                {!loading ? (
                                    t("Submit")
                                ) : (
                                    <Spinner style={{ height: "22px", width: "22px" }} />
                                )}
                            </Button>

                            <Button
                                type="button"
                                color="secondary"
                                disabled={loading}
                                onClick={handleReset}
                            >
                                {t("Cancel")}
                            </Button>
                        </div>
                    </Form>
                </ModalBody>
            </Modal>
        </div>
    )
}

export default ModalAddRole;
