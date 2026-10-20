import { sendSuccess } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { getValidatedParams, getValidatedQuery } from '../../middleware/validate';
import * as userService from './user.service';
import type { FreelancerListQuery, UpdateMeInput } from './user.validation';

export const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getMe(req.user!.id);
  sendSuccess(res, {
    user,
    profileCompletion: userService.getProfileCompletion(user),
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const body = req.body as UpdateMeInput;
  const user = await userService.updateMe(req.user!.id, body);
  sendSuccess(res, {
    user,
    profileCompletion: userService.getProfileCompletion(user),
  }, { message: 'Profile updated' });
});

export const listFreelancers = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<FreelancerListQuery>(req);
  const data = await userService.listFreelancers(query);
  sendSuccess(res, data);
});

export const getFreelancer = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const freelancer = await userService.getFreelancerById(id);
  sendSuccess(res, { freelancer });
});
