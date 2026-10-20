import { sendSuccess } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { getValidatedParams, getValidatedQuery } from '../../middleware/validate';
import * as proposalService from './proposal.service';
import type {
  CreateProposalInput,
  ProposalListQuery,
  UpdateProposalInput,
} from './proposal.validation';

export const submitProposal = asyncHandler(async (req, res) => {
  const { jobId } = getValidatedParams<{ jobId: string }>(req);
  const body = req.body as CreateProposalInput;
  const proposal = await proposalService.submitProposal(jobId, req.user!.id, body);
  sendSuccess(res, { proposal }, { statusCode: 201, message: 'Proposal submitted' });
});

export const listJobProposals = asyncHandler(async (req, res) => {
  const { jobId } = getValidatedParams<{ jobId: string }>(req);
  const query = getValidatedQuery<ProposalListQuery>(req);
  const data = await proposalService.listProposalsForJob(jobId, req.user!.id, query);
  sendSuccess(res, data);
});

export const listMyProposals = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ProposalListQuery>(req);
  const data = await proposalService.listMyProposals(req.user!.id, query);
  sendSuccess(res, data);
});

export const getProposal = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const proposal = await proposalService.getProposalById(id, req.user!);
  sendSuccess(res, { proposal });
});

export const updateProposal = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const body = req.body as UpdateProposalInput;
  const proposal = await proposalService.updateProposal(id, req.user!.id, body);
  sendSuccess(res, { proposal }, { message: 'Proposal updated' });
});

export const withdrawProposal = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const proposal = await proposalService.withdrawProposal(id, req.user!.id);
  sendSuccess(res, { proposal }, { message: 'Proposal withdrawn' });
});

export const acceptProposal = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const data = await proposalService.acceptProposal(id, req.user!.id);
  sendSuccess(res, data, { message: 'Proposal accepted — contract created' });
});

export const rejectProposal = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const proposal = await proposalService.rejectProposal(id, req.user!.id);
  sendSuccess(res, { proposal }, { message: 'Proposal rejected' });
});

export const getMyProposalForJob = asyncHandler(async (req, res) => {
  const { jobId } = getValidatedParams<{ jobId: string }>(req);
  const proposal = await proposalService.getMyProposalForJob(jobId, req.user!.id);
  sendSuccess(res, { proposal });
});
