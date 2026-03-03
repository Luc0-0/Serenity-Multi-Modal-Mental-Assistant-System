#!/bin/bash
cd c:/projects/Final\ year\ project/Serenity/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
