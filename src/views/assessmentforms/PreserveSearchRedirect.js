import { Navigate, useLocation } from "react-router-dom";

const PreserveSearchRedirect = () => {
    const location = useLocation();

    return (
        <Navigate
            to={`company-information${location.search}`}
            replace
        />
    );
};

export default PreserveSearchRedirect;