import { buildOfferReviewGuide } from "./jobs/offerReview.js";
import { buildOfferApprovalGuide } from "./jobs/offerApproval.js";
import { buildAssignmentReadinessGuide } from "./jobs/assignmentReadinessGuide.js";
import { buildVehicleDriverBindGuide } from "./jobs/vehicleDriverBind.js";

export const JOB_GUIDE_TYPES = [
  "OFFER_REVIEW",
  "OFFER_APPROVAL",
  "ASSIGNMENT_READINESS_GUIDE",
  "VEHICLE_DRIVER_BIND",
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
};

export function getJobGuideDefinition(jobType) {
  return REGISTRY[String(jobType || "")] || null;
}
