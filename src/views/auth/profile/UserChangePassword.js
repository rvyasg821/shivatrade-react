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

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Custom Components
import InputPassword from '@components/input-password-toggle';
import Notification from "@components/toast/notification";
// ** Third Party Components
import { useTranslation } from 'react-i18next';
import { cleanAuthMessage } from '../store';
import { useNavigate } from 'react-router-dom';
import { appsRoot } from "@constant/defaultValues";
import { startLoading, stopLoading } from '../../loadingstore';

const UserChangePassword = ({ toggle }) => {
    // ** Hooks
    const { t } = useTranslation()
    const navigate =useNavigate()
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

   const onSubmit = async (values) => {
  if (!values) return;

  const passwordPayload = {
    oldPassword: values?.oldPassword || "",
    newPassword: values?.newPassword || "",
    confirmPassword: values?.confirmPassword || "",
  };

  try {
    const result = await dispatch(changePassword(passwordPayload)).unwrap();
    console.log("Change Password Result:", result);

    // ✅ Check for your actual success condition
    if (result?.actionFlag === "CHANGE_PASSWORD_SCS" || result?.success) {
      Notification("Success", "Password changed successfully", "success");
      navigate(`${appsRoot}/profile`);
    } else {
      Notification("Error", "Failed to change password", "error");
    }
  } catch (err) {
    console.error("Password change failed:", err);
    Notification("Error", "Password change failed", "error");
  }
};

// loadding management
 useEffect(() => {
        if (!store?.loading) {
            dispatch(startLoading())
        } else {
            dispatch(stopLoading())
        }
    }, [store?.loading])

    return (
            <div className="main-content">
           <Card>
              <CardBody>
        <Fragment>

            <Form className="mt-2" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
                <Row>
                    <div className='mb-2 col-lg-6 col-md-6 col-sm-6 rounded-2 change-password'>
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

                    <div className='mb-2 col-lg-6 col-md-6 col-sm-6 change-password'>
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

                    <div className='mb-2 col-lg-6 col-md-6 col-sm-6 change-password'>
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
               <div className="d-flex justify-content-end profile-btn gap-2 pt-1 pb-4">
              <Button type="submit" color="primary" disabled={!store.loading}>
                {store?.loading ? t("Save") : <Spinner className="spinner-border-login" size="sm" />}
              </Button>

              {/* <Button color="secondary" onClick={toggle}>
                {t("Close")}
              </Button> */}
             
            </div>
            </Form>

        </Fragment>
        </CardBody>
        </Card>
        </div>
    )
}

export default UserChangePassword;
