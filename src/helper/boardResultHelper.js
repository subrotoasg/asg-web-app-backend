import axios from "axios";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import FormData from "form-data";
import fs from "fs";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

// const exam = "hsc";
// const year = "2025";
// const board = "dhaka";
// const roll = "186226";
// const reg = "2010590408";

const gradeOpt = [
  {
    grade: "A+",
    point: "5",
  },
  {
    grade: "A",
    point: "4",
  },
  {
    grade: "A-",
    point: "3.5",
  },
  {
    grade: "B",
    point: "3",
  },
  {
    grade: "C",
    point: "2",
  },
  {
    grade: "D",
    point: "1",
  },
  {
    grade: "F",
    point: "0",
  },
];

const subjectMap = [
  {
    name: "PHYSICS",
    rename: "physicsGPA",
  },
  {
    name: "CHEMISTRY",
    rename: "chemistryGPA",
  },
  {
    name: "HIGHER MATHEMATICS",
    rename: "mathGPA",
  },
  {
    name: "BIOLOGY",
    rename: "biologyGPA",
  },
  {
    name: "INFORMATION & COMMUNICATION TECHNOLOGY",
    rename: "ictGPA",
  },
  {
    name: "BANGLA",
    rename: "banglaGPA",
  },
  {
    name: "ENGLISH",
    rename: "englishGPA",
  },
];

function getMappedSubject(sub) {
  for (const e of subjectMap) {
    if (e?.name === sub) return e?.rename;
  }
}

function getPointsByGrade(grade) {
  for (const e of gradeOpt) {
    if (e?.grade === grade) return e?.point;
  }
  return null;
}

function extractCaptchaFromHTML(html) {
  const patterns = [
    /(\d+)\s*\+\s*(\d+)/, // 4 + 9
    /result\s+of\s+(\d+)\s*\+\s*(\d+)/i,
    /what\s+is\s+(\d+)\s*\+\s*(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const [_, a, b] = match;
      return parseInt(a) + parseInt(b);
    }
  }
  return null;
}

export async function fetchResult(payload = {}) {
  const { exam, year, board, roll, reg } = payload;

  try {
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar }));
    const home = await client.get("http://www.educationboardresults.gov.bd/", {
      responseType: "arraybuffer",
    });
    const htmlMain = iconv.decode(home.data, "utf-8");
    fs.writeFileSync("main-page.html", htmlMain);

    const captchaValue = extractCaptchaFromHTML(htmlMain);
    if (!captchaValue) {
      console.error("Could not detect captcha. Check main-page.html manually.");
      return;
    }

    const form = new FormData();
    form.append("sr", "3");
    form.append("et", "0");
    form.append("exam", exam);
    form.append("year", year);
    form.append("board", board);
    form.append("roll", roll);
    form.append("reg", reg);
    form.append("value_s", captchaValue);
    form.append("button2", "Submit");

    const response = await client.post(
      "http://www.educationboardresults.gov.bd/result.php",
      form,
      {
        headers: {
          ...form.getHeaders(),
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Referer: "http://www.educationboardresults.gov.bd/",
          Origin: "http://www.educationboardresults.gov.bd",
          Connection: "keep-alive",
        },
        responseType: "arraybuffer",
      }
    );

    const html = iconv.decode(response.data, "iso-8859-1");
    fs.writeFileSync("raw-response.html", html);

    const $ = cheerio.load(html);

    if (
      /Grade\s*Sheet/i.test($("body").text()) ||
      $("td:contains('GPA')").length > 0
    ) {
      // Extract student information
      const getValue = (label) =>
        $(`td:contains('${label}')`).next().text().trim();

      const name = $("td:contains('Name')")
        .filter((i, el) => $(el).text().trim() === "Name")
        .next()
        .text()
        .trim();
      const boardName = getValue("Board");
      const gpa = getValue("GPA");
      const resultStatus = getValue("Result");
      const institute = getValue("Institute");
      const father = getValue("Father's Name");
      const mother = getValue("Mother's Name");
      const group = getValue("Group");
      const type = getValue("Type");

      const resultPayload = {};

      resultPayload.name = name;
      resultPayload.father = father;
      resultPayload.mother = mother;
      resultPayload.board = board;
      resultPayload.institution = institute;
      resultPayload.group = group;
      resultPayload.type = type;
      exam === "hsc"
        ? (resultPayload.hscGPA = gpa)
        : exam === "ssc"
          ? (resultPayload.sscGPA = gpa)
          : (resultPayload.gpa = gpa);
      resultPayload.status = resultStatus;

      const gradeSheetTable = $("span.black16bold:contains('Grade Sheet')")
        .closest("tr")
        .next("tr")
        .find("table");

      if (gradeSheetTable.length === 0) {
        console.log(
          "⚠️  No subject table found in the HTML. Check raw-response.html"
        );
      } else {
        let gradeArray = [];
        gradeSheetTable.find("tr").each((i, row) => {
          const cols = $(row).find("td");
          if (cols.length === 3) {
            const code = $(cols[0]).text().trim();
            const subject = $(cols[1]).text().trim();
            const grade = $(cols[2]).text().trim();
            if (code && subject && grade) {
              // console.log(`${code.padEnd(5)} ${subject.padEnd(40)} ${grade}`);
              if (i !== 0)
                gradeArray.push({
                  code: code,
                  subject: getMappedSubject(subject),
                  grade: grade,
                  point: getPointsByGrade(grade),
                });
            }
          }
        });
        resultPayload.subjectGrade = gradeArray;
      }
      return resultPayload;
    } else {
      console.log("No results found in the response.");
      console.log(
        "Possible causes:\n- Invalid roll/registration\n- Result not published yet\n- Server rejected form session (try again)"
      );
      return null;
    }
  } catch (err) {
    console.error("Error fetching results:", err.message);
  }
}
