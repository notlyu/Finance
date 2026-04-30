const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services', 'transactionService.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace is_private: true with scope: 'personal'
content = content.replace(/is_private:\s*true/g, "scope: 'personal'");

// Replace is_private: false with scope: { in: ['family', 'shared'] }
content = content.replace(/is_private:\s*false/g, "scope: { in: ['family', 'shared'] }");

// Replace !!t.is_private with t.scope === 'personal'
content = content.replace(/!!t\.is_private/g, "t.scope === 'personal'");

// Replace is_private: !!t.is_private with scope: t.scope
content = content.replace(/is_private:\s*!!t\.is_private/g, 'scope: t.scope');

// Replace includePrivate logic
const oldIncludePrivate = `const includePrivate = String(query.includePrivate || 'all');
    if (includePrivate === 'only_private') {
        whereClause.is_private = true;
        whereClause.user_id = userId;
    } else if (includePrivate === 'only_visible') {
        whereClause.OR = [
            { is_private: false },
            { user_id: userId },
        ];
    }`;

const newIncludePrivate = `const includePrivate = String(query.includePrivate || 'all');
    if (includePrivate === 'only_private') {
        whereClause.scope = 'personal';
        whereClause.user_id = userId;
    } else if (includePrivate === 'only_visible') {
        whereClause.OR = [
            { scope: { in: ['family', 'shared'] } },
            { user_id: userId },
        ];
    }`;

content = content.replace(oldIncludePrivate, newIncludePrivate);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Scope changes applied successfully');
