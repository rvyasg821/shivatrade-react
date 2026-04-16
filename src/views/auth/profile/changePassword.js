// ** React Imports
import { Fragment, useEffect } from 'react';

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { changePassword } from "@src/views/auth/store";

// ** Reactstrap Imports
import {
    Row,
    Card,
    Form,
    Label,
    Button,
    Spinner,
    CardBody,
    FormFeedback
} from 'reactstrap';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Custom Components
import InputPassword from '@components/input-password-toggle';
import Notification from "@components/toast/notification";

// ** Third Party Components
import { useTranslation } from 'react-i18next';
import UserChangePassword from './UserChangePassword';
import { cleanAuthMessage } from '../store';
import { startLoading, stopLoading } from '../../loadingstore';

const ChangePassword = ({ toggle }) => {
    // ** Hooks
    const { t } = useTranslation()

    // ** Store vars
    const dispatch = useDispatch()
    const store = useSelector((state) => state.auth)


    // ** Const
    const defaultValues = {
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
    }

    /* Yup validation schema */
    const PasswordSchema = yup.object().shape({
        oldPassword: yup.string().required(`${t("Old password is required")}.`),
        newPassword: yup.string().required(`${t("New password is required")}.`)
            .min(8, `${t("New password must be at least 8 characters")}.`)
            .matches('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$', t("Min. 8 characters, At least one uppercase letter, One lowercase letter, One number and one special character.")),
        confirmPassword: yup.string().oneOf([yup.ref('newPassword'), null], `${t("New Password must match")}.`)
            .required(`${t("Confirm Password is required")}.`)
    })

    const {
        reset,
        control,
        handleSubmit,
        formState: { errors }
    } = useForm({
        mode: "all",
        defaultValues,
        resolver: yupResolver(PasswordSchema)
    })



    useEffect(() => {
        if (!store?.statusCode) return; // only act when statusCode exists

        if (store.statusCode >= 200 && store.statusCode < 300) {
            // Success
            Notification(""); reset(defaultValues); // reset form only on success
        } else {
            // Error
            Notification("Error", store.error || "Failed to change password", "warning");
        }

        dispatch(cleanAuthMessage()); // reset flags after showing toast
    }, [store.statusCode]); // watch only statusCode
    useEffect(() => {
        if (!store?.loading) {
            dispatch(startLoading())
        } else {
            dispatch(stopLoading())
        }
    }, [store?.loading])


    const onSubmit = (values) => {
        if (values) {
            const passwordPayload = {
                oldPassword: values?.oldPassword || "",
                newPassword: values?.newPassword || "",
                confirmPassword: values?.confirmPassword || ""
            }

            // console.log("onSubmit >>> ", values, passwordPayload);
            dispatch(changePassword(passwordPayload));
        }
    }
    const isAdmin =
        store?.authUserItem?.role &&
        typeof store.authUserItem.role.name === "string" &&
        store.authUserItem.role.name.trim().toLowerCase() === "admin";

    return (
        <Fragment>

            {isAdmin ? (
                <Card>
                    <CardBody>
                        <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
                            <Row>
                                <div className='mb-2 col-lg-6 col-md-6 col-sm-6 rounded-2"'>
                                    <Label className='form-label' for='oldPassword'>
                                        {t("Old Password")}
                                    </Label>
                                    <Controller
                                        id="oldPassword"
                                        name="oldPassword"
                                        control={control}
                                        render={({ field }) => (
                                            <InputPassword

                                                {...field}
                                                autoComplete="off"
                                                className='input-group-merge'
                                                invalid={errors.oldPassword && true}
                                            />
                                        )}
                                    />
                                    <FormFeedback>{errors.oldPassword?.message}</FormFeedback>
                                </div>

                                <div className='mb-2 col-lg-6 col-md-6 col-sm-6 '>
                                    <Label className='form-label' for='newPassword'>
                                        {t("New Password")}
                                    </Label>
                                    <Controller
                                        id="newPassword"
                                        name="newPassword"
                                        control={control}
                                        render={({ field }) => (
                                            <InputPassword
                                                {...field}
                                                autoComplete="off"
                                                className='input-group-merge'
                                                invalid={errors.newPassword && true}
                                            />
                                        )}
                                    />
                                    <FormFeedback>{errors.newPassword?.message}</FormFeedback>
                                </div>

                                <div className='mb-2 col-lg-6 col-md-6 col-sm-6 '>
                                    <Label className='form-label' for='confirmPassword'>
                                        {t("Confirm Password")}
                                    </Label>
                                    <Controller
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        control={control}
                                        render={({ field }) => (
                                            <InputPassword
                                                {...field}
                                                autoComplete="off"
                                                className='input-group-merge'
                                                invalid={errors.confirmPassword && true}
                                            />
                                        )}
                                    />
                                    <FormFeedback>{errors.confirmPassword?.message}</FormFeedback>
                                </div>
                            </Row>
                            <div className="d-flex justify-content-end mt-5 profile-btn gap-2 pt-1 pb-1 ">
                                <Button
                                    type="submit"
                                    color="primary"
                                    disabled={!store.loading}
                                >
                                    {store?.loading ? t("Save") : (<Spinner className="spinner-border-login" size="sm" />)}
                                </Button>
                            </div>
                        </Form>
                    </CardBody>
                </Card>
            ) : (<UserChangePassword toggle={toggle} />
            )}
        </Fragment>
    )
}

export default ChangePassword;
