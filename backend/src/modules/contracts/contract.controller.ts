import { sendSuccess } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { getValidatedParams, getValidatedQuery } from '../../middleware/validate';
import * as reviewService from '../reviews/review.service';
import type { CreateReviewInput } from '../reviews/review.validation';
import * as contractService from './contract.service';
import type {
  CancelContractInput,
  ContractListQuery,
  CreateMilestoneInput,
  RequestRevisionInput,
  SubmitMilestoneInput,
  UpdateMilestoneInput,
} from './contract.validation';

export const listMyContracts = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ContractListQuery>(req);
  const data = await contractService.listMyContracts(req.user!, query);
  sendSuccess(res, data);
});

export const getContract = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const contract = await contractService.getContractById(id, req.user!);
  sendSuccess(res, { contract });
});

export const completeContract = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const contract = await contractService.completeContract(id, req.user!.id);
  sendSuccess(res, { contract }, { message: 'Contract completed' });
});

export const cancelContract = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const body = req.body as CancelContractInput;
  const contract = await contractService.cancelContract(id, req.user!.id, body);
  sendSuccess(res, { contract }, { message: 'Contract cancelled' });
});

export const addMilestone = asyncHandler(async (req, res) => {
  const { contractId } = getValidatedParams<{ contractId: string }>(req);
  const body = req.body as CreateMilestoneInput;
  const contract = await contractService.addMilestone(contractId, req.user!.id, body);
  sendSuccess(res, { contract }, { statusCode: 201, message: 'Milestone added' });
});

export const updateMilestone = asyncHandler(async (req, res) => {
  const { contractId, milestoneId } = getValidatedParams<{
    contractId: string;
    milestoneId: string;
  }>(req);
  const body = req.body as UpdateMilestoneInput;
  const contract = await contractService.updateMilestone(
    contractId,
    milestoneId,
    req.user!.id,
    body,
  );
  sendSuccess(res, { contract }, { message: 'Milestone updated' });
});

export const deleteMilestone = asyncHandler(async (req, res) => {
  const { contractId, milestoneId } = getValidatedParams<{
    contractId: string;
    milestoneId: string;
  }>(req);
  const contract = await contractService.deleteMilestone(contractId, milestoneId, req.user!.id);
  sendSuccess(res, { contract }, { message: 'Milestone deleted' });
});

export const submitMilestone = asyncHandler(async (req, res) => {
  const { contractId, milestoneId } = getValidatedParams<{
    contractId: string;
    milestoneId: string;
  }>(req);
  const body = req.body as SubmitMilestoneInput;
  const contract = await contractService.submitMilestone(
    contractId,
    milestoneId,
    req.user!.id,
    body,
  );
  sendSuccess(res, { contract }, { message: 'Milestone submitted' });
});

export const approveMilestone = asyncHandler(async (req, res) => {
  const { contractId, milestoneId } = getValidatedParams<{
    contractId: string;
    milestoneId: string;
  }>(req);
  const contract = await contractService.approveMilestone(contractId, milestoneId, req.user!.id);
  sendSuccess(res, { contract }, { message: 'Milestone approved' });
});

export const requestRevision = asyncHandler(async (req, res) => {
  const { contractId, milestoneId } = getValidatedParams<{
    contractId: string;
    milestoneId: string;
  }>(req);
  const body = req.body as RequestRevisionInput;
  const contract = await contractService.requestMilestoneRevision(
    contractId,
    milestoneId,
    req.user!.id,
    body,
  );
  sendSuccess(res, { contract }, { message: 'Revision requested' });
});

export const createReview = asyncHandler(async (req, res) => {
  const { contractId } = getValidatedParams<{ contractId: string }>(req);
  const body = req.body as CreateReviewInput;
  const review = await reviewService.createReview(contractId, req.user!, body);
  sendSuccess(res, { review }, { statusCode: 201, message: 'Review submitted' });
});

export const listContractReviews = asyncHandler(async (req, res) => {
  const { contractId } = getValidatedParams<{ contractId: string }>(req);
  const reviews = await reviewService.listContractReviews(contractId, req.user!);
  sendSuccess(res, { reviews });
});
