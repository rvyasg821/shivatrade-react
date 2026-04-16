// ** React Imports
import { Fragment, useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getTool, updateTool, cleanToolsMessage, setSelectedCompany } from "../store";

// ** Reactstrap Imports
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Label,
  Button,
  CardBody,
  CardHeader,
  FormFeedback,
} from "reactstrap";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";

// ** Custom Components
import ToolsErrorBoundary from "../components/ToolsErrorBoundary";
import ToolsErrorAlert from "../components/ToolsErrorAlert";
import ToolTabbedInterface from "../components/ToolTabbedInterface";

// ** Role-based utilities
import { getUserRole, hasToolsPermission, isSuperAdmin } from "../utils/roleUtils";

// ** Navigation utilities
import { getCompanyFromURL } from "../utils/navigationUtils";

// ** Constants
import { appsRoot } from "@constant/defaultValues";

const ToolEdit = () => {
  // ** Hooks
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  console.log('=== TOOL EDIT COMPONENT LOADED ===');
  console.log('Tool ID:', id);
  console.log('Search Params:', searchParams.toString());

  // Simple test state
  const [toolSettings] = useState([
    { name: 'Test Setting', type: 'api', port: 443 }
  ]);
  const [toolSchedules] = useState([
    { name: 'Test Schedule', type: 'cron', expression: '0 0 * * *' }
  ]);

  const selectedCompany = searchParams.get('company') || '';
  console.log('Selected Company:', selectedCompany);

  return (
    <Fragment>
      <div style={{ padding: '20px', backgroundColor: '#f0f0f0', border: '5px solid red' }}>
        <h1 style={{ color: 'red', fontSize: '32px', textAlign: 'center' }}>
          🔥 TOOL EDIT COMPONENT IS WORKING! 🔥
        </h1>
        <div style={{ backgroundColor: 'yellow', padding: '15px', margin: '15px 0', fontSize: '18px' }}>
          <strong>Tool ID:</strong> {id}<br />
          <strong>Company:</strong> {selectedCompany || 'None'}<br />
          <strong>URL:</strong> {window.location.href}<br />
          <strong>Settings Count:</strong> {toolSettings.length}<br />
          <strong>Schedules Count:</strong> {toolSchedules.length}
        </div>
        
        <div style={{ backgroundColor: 'lightgreen', padding: '15px', margin: '15px 0' }}>
          <h2>Now testing ToolTabbedInterface...</h2>
        </div>
        
        <ToolTabbedInterface
          toolId={id}
          selectedCompany={selectedCompany}
          onSettingsChange={() => console.log('Settings changed')}
          onSchedulesChange={() => console.log('Schedules changed')}
          initialSettings={toolSettings}
          initialSchedules={toolSchedules}
        >
          <div style={{ backgroundColor: 'lightblue', padding: '20px', border: '3px solid blue' }}>
            <h3>TOOL FORM CONTENT (Tab 1)</h3>
            <p>This is the tool form content inside the tabbed interface.</p>
            <input type="text" placeholder="Tool Name" style={{ padding: '10px', margin: '10px', fontSize: '16px' }} />
            <br />
            <textarea placeholder="Description" style={{ padding: '10px', margin: '10px', fontSize: '16px', width: '300px', height: '100px' }}></textarea>
          </div>
        </ToolTabbedInterface>
        
        <div style={{ backgroundColor: 'orange', padding: '15px', margin: '15px 0' }}>
          <h2>ToolTabbedInterface should appear above this message</h2>
        </div>
      </div>
    </Fragment>
  );
};

export default ToolEdit;