/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Activities from './pages/Activities';
import AsaasIntegration from './pages/AsaasIntegration';
import Auditoria from './pages/Auditoria';
import Cadastro from './pages/Cadastro';
import Checkouts from './pages/Checkouts';
import ClientDetail from './pages/ClientDetail';
import ClientRegistration from './pages/ClientRegistration';
import Clients from './pages/Clients';
import CommercialDashboard from './pages/CommercialDashboard';
import CommercialTeam from './pages/CommercialTeam';
import ContractLibrary from './pages/ContractLibrary';
import ContractTemplates from './pages/ContractTemplates';
import Contracts from './pages/Contracts';
import ContractsDashboard from './pages/ContractsDashboard';
import Dashboard from './pages/Dashboard';
import DashboardComercialInterno from './pages/DashboardComercialInterno';
import Documentation from './pages/Documentation';
import Goals from './pages/Goals';
import Leads from './pages/Leads';
import LinkGenerator from './pages/LinkGenerator';
import MRRDashboard from './pages/MRRDashboard';
import Marketing from './pages/Marketing';
import Metrics from './pages/Metrics';
import OTE from './pages/OTE';
import OperationalTeam from './pages/OperationalTeam';
import Orders from './pages/Orders';
import Payments from './pages/Payments';
import Pipeline from './pages/Pipeline';
import PipelineManagement from './pages/PipelineManagement';
import Products from './pages/Products';
import Reports from './pages/Reports';
import RoleManagement from './pages/RoleManagement';
import SalesMetrics from './pages/SalesMetrics';
import Settings from './pages/Settings';
import Squads from './pages/Squads';
import UsersManagement from './pages/UsersManagement';
import Verify2FA from './pages/Verify2FA';
import WorkflowAutomation from './pages/WorkflowAutomation';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Activities": Activities,
    "AsaasIntegration": AsaasIntegration,
    "Auditoria": Auditoria,
    "Cadastro": Cadastro,
    "Checkouts": Checkouts,
    "ClientDetail": ClientDetail,
    "ClientRegistration": ClientRegistration,
    "Clients": Clients,
    "CommercialDashboard": CommercialDashboard,
    "CommercialTeam": CommercialTeam,
    "ContractLibrary": ContractLibrary,
    "ContractTemplates": ContractTemplates,
    "Contracts": Contracts,
    "ContractsDashboard": ContractsDashboard,
    "Dashboard": Dashboard,
    "DashboardComercialInterno": DashboardComercialInterno,
    "Documentation": Documentation,
    "Goals": Goals,
    "Leads": Leads,
    "LinkGenerator": LinkGenerator,
    "MRRDashboard": MRRDashboard,
    "Marketing": Marketing,
    "Metrics": Metrics,
    "OTE": OTE,
    "OperationalTeam": OperationalTeam,
    "Orders": Orders,
    "Payments": Payments,
    "Pipeline": Pipeline,
    "PipelineManagement": PipelineManagement,
    "Products": Products,
    "Reports": Reports,
    "RoleManagement": RoleManagement,
    "SalesMetrics": SalesMetrics,
    "Settings": Settings,
    "Squads": Squads,
    "UsersManagement": UsersManagement,
    "Verify2FA": Verify2FA,
    "WorkflowAutomation": WorkflowAutomation,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};