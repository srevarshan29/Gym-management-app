import { cache } from "react";

import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { MemberDoc } from "@/lib/firestore/types";

/**
 * One Firestore member read per React request tree for portal routes.
 * Uses member context so `assertMemberSelfAccess` applies.
 */
export const getPortalMemberDoc = cache(
  async (ctx: MemberContext): Promise<DocWithId<MemberDoc> | null> => {
    const { members } = getRepositories();
    return members.findByIdAndGym(ctx, ctx.memberId, ctx.gymId);
  },
);
