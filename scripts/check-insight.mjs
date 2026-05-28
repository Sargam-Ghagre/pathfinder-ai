import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const industry = process.argv[2] || 'Technology';

async function main(){
  try{
    const insight = await db.industryInsight.findUnique({ where: { industry } });
    console.log(JSON.stringify({ industry, insight }, null, 2));
  }catch(e){
    console.error('Error querying IndustryInsight:', e);
    process.exitCode = 1;
  }finally{
    await db.$disconnect();
  }
}

main();
