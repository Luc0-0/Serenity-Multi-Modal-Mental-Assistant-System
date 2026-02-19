#!/usr/bin/env python3

import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'journal_entries' ORDER BY ordinal_position"))
        print('Journal entries schema:')
        for row in result:
            print(f'  {row[0]}: {row[1]}')
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
