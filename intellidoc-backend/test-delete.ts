import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ws = await prisma.workspace.findFirst();
  if (ws) {
     console.log("Found workspace:", ws.id);
     try {
       await prisma.workspace.delete({ where: { id: ws.id } });
       console.log("Deleted successfully");
     } catch (e) {
       console.error("Delete failed:", e);
     }
  } else {
     console.log("No workspace found");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
