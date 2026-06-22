---
name: lint-setup
description: >
  Линтинг и форматирование Finance-проекта (ESLint 9 flat config + Prettier).
  Использовать при фразах "запусти линт", "lint", "проверь код",
  "почини стиль", "форматируй код", "настрой eslint". Запускает проверку,
  авто-фикс и форматирование бэкенда (Node.js/CommonJS).
---

# lint-setup — линтинг и форматирование

## Триггеры
- `"запусти линт"` / `"lint"` / `"проверь код"`
- `"почини стиль"` / `"форматируй код"`
- `"настрой eslint"` (повторная настройка)

## Команды

| Команда | Что делает |
|---------|------------|
| `npm run lint` | Проверка (ESLint, `--max-warnings=0` — падает на любом warning) |
| `npm run lint:fix` | Авто-исправление того, что ESLint умеет чинить |
| `npm run format` | Prettier — форматирует `**/*.{js,json,md}` |
| `npm run format:check` | Prettier — только проверка без изменений |

## Конфигурация (уже настроено)

- **`eslint.config.js`** — flat config (ESLint 9). Бэкенд: Node.js + CommonJS.
  - Игноры: `client/**`, `node_modules/**`, `coverage/**`, `prisma/migrations/**`, `**/*.min.js`
  - Тесты (`tests/**`, `**/*.test.js`) — с Jest-глобалами, `no-unused-vars` отключён
  - `no-unused-vars`: warn, игнор для `_`-префикса и rest-siblings
- **`.prettierrc.json`** — single quote, 2 пробела, printWidth 100, trailingComma es5
- **`.prettierignore`** — client, node_modules, coverage, миграции

## Порядок работы по запросу "запусти линт"

1. `npm run lint`
2. Если есть ошибки/warnings:
   - Сначала `npm run lint:fix` (авто-фикс)
   - Затем `npm run lint` снова — посмотреть что осталось
   - Оставшееся чинить вручную, по одному файлу
3. Сообщить итог: сколько было / сколько осталось

## Типичные ручные фиксы

- **`no-unused-vars`** на импортах → удалить неиспользуемый импорт из деструктуризации
- **Неиспользуемый аргумент** → префикс `_` (напр. `_next` в error-middleware Express — 4-й аргумент обязателен для распознавания error-handler'а)
- **Неиспользуемый `catch (e)`** → bare `catch {` (ES2019 optional catch binding)
- **`no-useless-escape`** в regex character class → убрать лишний `\` (напр. `[\d.,\-]` → `[\d.,-]`)
- **Деструктуризация для исключения поля** (`{ x, ...rest }`) → покрыто `ignoreRestSiblings: true`

## Важно
- ВСЕГДА запускать `npm run lint` перед commit/push (правило из `CLAUDE.md`)
- Клиент (`client/`) линтуется отдельно через `react-scripts` — НЕ трогается этим скиллом
- После авто-фикса ОБЯЗАТЕЛЬНО прогнать `npm test` — авто-фикс может изменить поведение (редко, но проверяем)
- Если ESLint не установлен (`npx eslint` падает) — переустановить:
  `npm install --save-dev eslint@9 prettier eslint-config-prettier eslint-plugin-n globals`
