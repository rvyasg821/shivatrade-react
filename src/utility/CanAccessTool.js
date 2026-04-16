import { useSelector } from "react-redux";
import PropTypes from 'prop-types';

/**
 * Component to gate access to UI elements based on subscribed tools.
 * 
 * @param {Object} props
 * @param {string} props.slug - The slug of the tool to check access for.
 * @param {React.ReactNode} props.children - The content to render if access is granted.
 * @param {React.ReactNode} props.fallback - The content to render if access is denied (default: null).
 */
const CanAccessTool = ({ slug, children, fallback = null }) => {
    const companyData = useSelector((state) => state.authentication.companyData);
    const userData = useSelector((state) => state.authentication.userData);

    // Determine if we should check company tools (for Company Admin/Tenant User) or bypass (for Super Admin)
    // Note: Super Admin role name is 'Admin' in database
    const isSuperAdmin = userData?.role?.name === 'Admin' || userData?.isSystemUser === true || userData?.userType === 'admin';

    if (isSuperAdmin) {
        return children;
    }

    // Tools are expected to be in companyData.tools (array of objects with slug)
    const subscribedTools = companyData?.tools || [];

    // Check if any subscribed tool matches the requested slug
    const hasAccess = subscribedTools.some(tool => tool.slug === slug || tool._id === slug); // Support ID check as fallback

    return hasAccess ? children : fallback;
};

CanAccessTool.propTypes = {
    slug: PropTypes.string.isRequired,
    children: PropTypes.node,
    fallback: PropTypes.node
};

export default CanAccessTool;
