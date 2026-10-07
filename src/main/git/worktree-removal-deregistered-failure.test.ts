// Git deletes the checkout's admin record even when deleting the checkout itself fails, so the
// leftover must be finished here or nothing can ever reach it again.
import { mkdtemp, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { gitExecFileAsync, listWorktreesStrict, removeHostTree } = vi.hoisted(
  () => ({
    gitExecFileAsync: vi.fn(),
    listWorktreesStrict: vi.fn(),
    removeHostTree: vi.fn(),
  }),
);

vi.mock("./runner", () => ({ gitExecFileAsync }));
vi.mock("./worktree-listing", () => ({ listWorktreesStrict }));
vi.mock("../host-tree-removal", () => ({ removeHostTree }));

import { removeWorktree } from "./worktree-removal";

const gitDeleteFailure = new Error(
  "error: failed to delete '/w/feature': Directory not empty",
);

let worktreePath = "";

beforeEach(async () => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  // An existing path stands in for the half-deleted checkout.
  worktreePath = await realpath(
    await mkdtemp(join(tmpdir(), "orca-deregistered-")),
  );
  gitExecFileAsync.mockImplementation(async (args: string[]) => {
    if (args.includes("remove")) {
      throw gitDeleteFailure;
    }
    return { stdout: "", stderr: "" };
  });
});

const known = () => ({
  path: worktreePath,
  head: "abc",
  branch: "",
  isBare: false,
});

describe("removeWorktree when git fails to delete the checkout", () => {
  it("finishes the delete when git already dropped the registration", async () => {
    listWorktreesStrict.mockResolvedValue([]);

    await removeWorktree("/repo", worktreePath, true, {
      knownRemovedWorktree: known(),
      deleteBranch: false,
    } as never);

    expect(removeHostTree).toHaveBeenCalledWith(worktreePath);
  });

  it("keeps git's error when the checkout is still registered", async () => {
    listWorktreesStrict.mockResolvedValue([known()]);

    await expect(
      removeWorktree("/repo", worktreePath, true, {
        knownRemovedWorktree: known(),
        deleteBranch: false,
      } as never),
    ).rejects.toBe(gitDeleteFailure);
    expect(removeHostTree).not.toHaveBeenCalled();
  });
});
