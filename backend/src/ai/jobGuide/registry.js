import { buildOfferReviewGuide } from "./jobs/offerReview.js";
import { buildOfferApprovalGuide } from "./jobs/offerApproval.js";
import { buildAssignmentReadinessGuide } from "./jobs/assignmentReadinessGuide.js";
import { buildVehicleDriverBindGuide } from "./jobs/vehicleDriverBind.js";
import { buildTelematicsDeviceCreateGuide } from "./jobs/telematicsDeviceCreate.js";
import { buildLocationSourceGuide } from "./jobs/locationSourceGuide.js";
import { buildGpsSignalDiagnosisGuide } from "./jobs/gpsSignalDiagnosisGuide.js";
import { buildScreenMenuGuide } from "./jobs/screenMenuGuide.js";
import { buildButtonActionGuide } from "./jobs/buttonActionGuide.js";
import { buildRoleHelpGuide } from "./jobs/roleHelpGuide.js";

export const JOB_GUIDE_TYPES = [
  "OFFER_REVIEW",
  "OFFER_APPROVAL",
  "ASSIGNMENT_READINESS_GUIDE",
  "VEHICLE_DRIVER_BIND",
  "TELEMATICS_DEVICE_CREATE",
  "LOCATION_SOURCE_GUIDE",
  "GPS_SIGNAL_DIAGNOSIS_GUIDE",
  "SCREEN_MENU_GUIDE",
  "BUTTON_ACTION_GUIDE",
  "ROLE_HELP_GUIDE",
];

const REGISTRY = {
  OFFER_REVIEW: {
    entityType: "shift",
    builder: buildOfferReviewGuide,
  },
  OFFER_APPROVAL: {
    entityType: "shift",
    builder: buildOfferApprovalGuide,
  },
  ASSIGNMENT_READINESS_GUIDE: {
    entityType: "shift",
    builder: buildAssignmentReadinessGuide,
  },
  VEHICLE_DRIVER_BIND: {
    entityType: "vehicle",
    builder: buildVehicleDriverBindGuide,
  },
  TELEMATICS_DEVICE_CREATE: {
    entityType: "vehicle",
    builder: buildTelematicsDeviceCreateGuide,
  },
  LOCATION_SOURCE_GUIDE: {
    entityType: "vehicle",
    builder: buildLocationSourceGuide,
  },
  GPS_SIGNAL_DIAGNOSIS_GUIDE: {
    entityType: "vehicle",
    builder: buildGpsSignalDiagnosisGuide,
  },
  SCREEN_MENU_GUIDE: {
    entityType: "screen",
    builder: buildScreenMenuGuide,
  },
  BUTTON_ACTION_GUIDE: {
    entityType: "screen",
    builder: buildButtonActionGuide,
  },
  ROLE_HELP_GUIDE: {
    entityType: "screen",
    builder: buildRoleHelpGuide,
  },
};

export function getJobGuideDefinition(jobType) {
  return REGISTRY[String(jobType || "")] || null;
}
