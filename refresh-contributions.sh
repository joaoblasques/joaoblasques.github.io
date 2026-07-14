#!/bin/sh
# Refresh data/contributions.json from the real GitHub contribution calendar.
# Requires: gh (authenticated). Run before `node build.js` when you want fresh numbers.
set -e
cd "$(dirname "$0")"

gh api graphql -f query='{
  user(login: "joaoblasques") {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}' --jq '.data.user.contributionsCollection.contributionCalendar' > data/contributions.json

node -e 'const c=require("./data/contributions.json");console.log(`${c.totalContributions} contributions, ${c.weeks.length} weeks, through ${c.weeks.at(-1).contributionDays.at(-1).date}`)'
