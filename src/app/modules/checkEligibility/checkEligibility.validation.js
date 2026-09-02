import { z } from "zod";
const gpaSchema = z
  .number({
    required_error: "GPA is required",
    invalid_type_error: "GPA must be a number",
  })
  .min(1.0, { message: "GPA cannot be less than 1.0" })
  .max(5.0, { message: "GPA cannot exceed 5.0" })
  .positive();

const createcheckEligibilityValidationSchema = z.object({
  body: z.object({
    sscYear: z.string({
      required_error: "ssc passing year required",
    }),
    hscYear: z.string({
      required_error: "hsc passing year required",
    }),
    sscGPA: gpaSchema,
    hscGPA: gpaSchema,
    physicsGPA: gpaSchema,
    chemistryGPA: gpaSchema,
    mathGPA: gpaSchema,
    biologyGPA: gpaSchema,
    englishGPA: gpaSchema,
    ictGPA: gpaSchema,
    banglaGPA: gpaSchema,
    secondTimer: z.enum(["yes", "no"], {
      required_error: "Second timer status is required",
      invalid_type_error: "Second timer must be 'yes' or 'no'",
    }),
  }),
});

//update checkEligibility Schema
const updatecheckEligibilityValidationSchema = z.object({
  body: z.object({}),
});

const getBoardResultsValidationSchema = z.object({
  body: z.object({
    exam: z.enum(
      ["hsc", "ssc", "jsc", "ssc_voc", "hsc_voc", "hsc_hbm", "hsc_dic"],
      {
        required_error: "exam type is required",
        invalid_type_error:
          "exam must be either hsc, ssc, jsc, ssc_voc, hsc_voc, hsc_hbm, hsc_dic",
      }
    ),
    board: z.enum(
      [
        "barisal",
        "chittagong",
        "comilla",
        "dhaka",
        "dinajpur",
        "jessore",
        "mymensingh",
        "rajshahi",
        "sylhet",
        "madrasah",
        "tec",
        "dibs",
      ],
      {
        required_error: "board selection is required",
        invalid_type_error:
          "board must be either barisal,chittagong,comilla,dhaka,dinajpur,jessore,mymensingh,rajshahi,sylhet,madrasah,tec,dibs",
      }
    ),
    year: z.string({ required_error: "please select a valid year" }),
    roll: z.string({ required_error: "please give your roll" }),
    reg: z.string({ required_error: "please give your registration" }),
  }),
});

export const checkEligibilityValidationSchema = {
  createcheckEligibilityValidationSchema,
  updatecheckEligibilityValidationSchema,
  getBoardResultsValidationSchema,
};
