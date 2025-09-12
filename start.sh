#!/bin/bash

echo "Starting Prompt Battle WebGame..."
echo

cd backend

echo "Installing dependencies..."
npm install

echo
echo "Starting server..."
echo "Game will be available at: http://localhost:3000"
echo

npm run dev
