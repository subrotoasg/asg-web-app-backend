import { prisma } from "../../../../constants/index.js";
import { buildActiveChatData } from "../utlis/buildActiveChatData.js";

export async function saveChats(messages) {
  if (!messages?.length) {
    return false;
  }

  const data = messages?.map((message) => buildActiveChatData(message));

  await prisma.activeChat.createMany({
    data,
    skipDuplicates: true,
  });

  return true;
}

export async function saveChatOne(message) {
  await prisma.activeChat.createMany({
    data: [buildActiveChatData(message)],
    skipDuplicates: true,
  });

  return true;
}
