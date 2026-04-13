const Workspace = require('../models/Workspace');

const slugify = (value = '') => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'workspace';
};

const createUniqueWorkspaceSlug = async (baseName) => {
  const base = slugify(baseName);
  let candidate = base;
  let counter = 1;

  while (await Workspace.exists({ slug: candidate })) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
};

const ensureWorkspaceForAdminUser = async (user, workspaceName) => {
  if (!user || user.role !== 'admin') {
    return null;
  }

  if (user.workspace) {
    return Workspace.findById(user.workspace);
  }

  const name = workspaceName?.trim() || `${user.name}'s Workspace`;
  const slug = await createUniqueWorkspaceSlug(name);

  const workspace = await Workspace.create({
    name,
    slug,
    owner: user._id,
    admins: [user._id],
  });

  user.workspace = workspace._id;
  await user.save();

  return workspace;
};

const findWorkspaceByInviteCode = async (inviteCode) => {
  if (!inviteCode?.trim()) {
    return null;
  }

  return Workspace.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
};

module.exports = {
  createUniqueWorkspaceSlug,
  ensureWorkspaceForAdminUser,
  findWorkspaceByInviteCode,
};
