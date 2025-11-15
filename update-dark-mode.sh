#!/bin/bash

# Script to add dark mode support to all text elements
# This ensures all text and numbers are clearly visible in dark mode

cd /home/sakkekood/Hackathons/Junction2025/migraine-tracker-web/src

# Common text color patterns to update
# text-gray-900 (very dark text) -> add dark:text-gray-100 (very light)
find . -name "*.tsx" -type f -exec sed -i 's/\(className="[^"]*\)text-gray-900\([^"]*"\)/\1text-gray-900 dark:text-gray-100\2/g' {} \;

# text-gray-800 -> add dark:text-gray-200
find . -name "*.tsx" -type f -exec sed -i 's/\(className="[^"]*\)text-gray-800\([^"]*"\)/\1text-gray-800 dark:text-gray-200\2/g' {} \;

# text-gray-700 -> add dark:text-gray-300
find . -name "*.tsx" -type f -exec sed -i 's/\(className="[^"]*\)text-gray-700\([^"]*"\)/\1text-gray-700 dark:text-gray-300\2/g' {} \;

# text-gray-600 -> add dark:text-gray-400
find . -name "*.tsx" -type f -exec sed -i 's/\(className="[^"]*\)text-gray-600\([^"]*"\)/\1text-gray-600 dark:text-gray-400\2/g' {} \;

# text-gray-500 -> add dark:text-gray-400 (same as 600 for readability)
find . -name "*.tsx" -type f -exec sed -i 's/\(className="[^"]*\)text-gray-500\([^"]*"\)/\1text-gray-500 dark:text-gray-400\2/g' {} \;

# bg-gray-50 -> add dark:bg-gray-800
find . -name "*.tsx" -type f -exec sed -i 's/\(className="[^"]*\)bg-gray-50\([^"]*"\)/\1bg-gray-50 dark:bg-gray-800\2/g' {} \;

# bg-gray-100 -> add dark:bg-gray-700
find . -name "*.tsx" -type f -exec sed -i 's/\(className="[^"]*\)bg-gray-100\([^"]*"\)/\1bg-gray-100 dark:bg-gray-700\2/g' {} \;

# border-gray-200 -> add dark:border-gray-700
find . -name "*.tsx" -type f -exec sed -i 's/\(className="[^"]*\)border-gray-200\([^"]*"\)/\1border-gray-200 dark:border-gray-700\2/g' {} \;

# border-gray-300 -> add dark:border-gray-600
find . -name "*.tsx" -type f -exec sed -i 's/\(className="[^"]*\)border-gray-300\([^"]*"\)/\1border-gray-300 dark:border-gray-600\2/g' {} \;

echo "Dark mode classes added to all files!"
echo "Note: Some files may have duplicates that need manual cleanup"

