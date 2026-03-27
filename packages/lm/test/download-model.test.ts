import { describe, expect, it } from "vitest";

import { getDownloadPlan, parseContentLength } from "../bin/download-model-lib.mjs";

describe("download-model helpers", () => {
  it("parses the last content-length from redirected headers", () => {
    const headers = [
      "HTTP/2 302",
      "content-length: 258",
      "",
      "HTTP/2 200",
      "content-length: 651643502",
      ""
    ].join("\n");

    expect(parseContentLength(headers)).toBe(651643502);
  });

  it("skips a file when local and remote sizes match", () => {
    expect(getDownloadPlan(100, 100)).toEqual({
      action: "skip",
      reason: "local file matches remote size"
    });
  });

  it("resumes a file when local size is smaller than remote size", () => {
    expect(getDownloadPlan(100, 200)).toEqual({
      action: "resume",
      reason: "local file is incomplete"
    });
  });

  it("restarts a file when remote size is unavailable", () => {
    expect(getDownloadPlan(100, null)).toEqual({
      action: "restart",
      reason: "remote size unavailable"
    });
  });
});
