import { z } from "zod";

export const ClaimSchema = z.object({
    policyNumber: z.string().min(1, "Policy number is required"),
    claimDescription: z.string().min(1, "Claim description is required"),
    // <input type="file" /> provides FileList, not File.
    claimFile: z
        .custom<FileList>((value) => value instanceof FileList, {
            message: "A valid file is required",
        })
        .refine((files) => files.length > 0, {
            message: "A valid file is required",
        }),
});

export type ClaimFormData = z.infer<typeof ClaimSchema>;