# RouteMate — полное заполнение Chrome Web Store

Готовый комплект для публикации версии 0.4.0. Тексты в блоках можно копировать в Chrome Web Store Developer Dashboard без перевода.

## Перед отправкой: три обязательных действия

1. Проверить, что `PRIVACY_POLICY.md` и `TERMS.md` содержат рабочий адрес поддержки `martynovroman517@gmail.com`.
2. Опубликовать Privacy Policy и Terms на общедоступных HTTPS-страницах. Для пет-проекта подойдёт GitHub Pages.
3. Проверить, что URL ниже открываются без авторизации и ведут на RouteMate.

Имя издателя, имя разработчика и контактные данные должны быть правдивыми и согласованными. В панели сейчас отображается издатель `apacer.BF`, а в юридических файлах — `Roman Martynov`; перед публикацией выберите корректное публичное представление и используйте его последовательно. Статус trader/non-trader выбирайте только исходя из своего фактического статуса.

## 1. Описание продукта

### Название

Название берётся из `manifest.json`:

```text
RouteMate: Multi-stop Planner
```

Не добавляйте в название `Google Maps`, `free`, `best`, `official` или набор ключевых слов.

### Краткое описание

Краткое описание также берётся из `manifest.json`. Оно содержит 120 символов при лимите 132:

```text
Turn Google Maps places into a private field-day plan with visit windows, job details, statuses, and local optimization.
```

### Полное описание

Вставьте в поле **Описание**:

```text
RouteMate turns places you open in Google Maps into a structured field-day plan for technicians, inspectors, service professionals, sales representatives, and anyone who visits multiple locations.

Save the currently selected place without copying its address by hand, organize visits, and open the finished route in Google Maps when you are ready to travel.

Key features:
- Save the place currently open in Google Maps.
- Maintain up to 20 named routes with up to 50 stops each.
- Add visit status, priority, service duration, time windows, task type, contact details, and private notes.
- See the next visit, completion progress, projected finish time, and local schedule-conflict warnings.
- Reorder visits manually, by drag and drop, reverse pending work, or run local route optimization.
- Keep the first and final stops fixed when needed.
- Duplicate recurring routes while resetting their completion status.
- Skip finished visits when opening navigation.
- Import and export CSV files.
- Back up and restore the complete workspace as JSON.
- Open long plans as connected Google Maps route sections.

Privacy by design:
Route data, customer details, and notes stay in Chrome storage on the user's device. RouteMate has no account, ads, analytics, subscription, or external backend.

Important:
RouteMate's optimizer uses approximate straight-line distance. Schedule forecasts use the travel buffer entered by the user and are not live traffic ETAs. Always review the route in Google Maps before travelling.

RouteMate is free and open source. It is an independent product and is not affiliated with, endorsed by, or sponsored by Google.
```

### Категория

Выберите **Работа и планирование / Workflow & Planning**. Это точнее отражает сценарий RouteMate, чем общая категория «Инструменты».

### Язык

Выберите **English (United States)**.

Причина: интерфейс текущей версии RouteMate англоязычный. Русскую и украинскую карточки магазина стоит включать только после добавления соответствующих `_locales/ru` и `_locales/uk` в расширение. Иначе витрина создаст ожидание локализованного продукта, которого пока нет.

## 2. Графические объекты

### Значок магазина — обязателен

Загрузите:

```text
store/assets/store-icon-128.png
```

Параметры: PNG, 128×128 px; сам знак занимает примерно 96×96 px и окружён прозрачным полем 16 px. Он читается на светлом и тёмном фоне.

Идея знака: жёлтая геометка и пунктирный маршрут на зелёной плитке. Не используйте логотип Google Maps и не добавляйте текст внутрь значка.

### Скриншоты — обязателен минимум один, рекомендуется пять

Формат каждого файла: PNG или JPEG, **1280×800 px**, прямые углы, без внешних полей. Показывайте реальный интерфейс текущей версии, а не рекламный макет.

Рекомендуемая последовательность:

| № | Что показать | Короткая подпись для подготовки кадра |
|---|---|---|
| 1 | Google Maps и открытая боковая панель RouteMate; добавление места | Save a place from Google Maps in one click. |
| 2 | Маршрут с time window, task type, contact, priority и duration | Turn locations into a structured field-day plan. |
| 3 | Planned finish, progress и schedule conflict | Spot timing conflicts before starting the route. |
| 4 | Next visit, статусы Start/Complete и выполненные точки | Run the workday one visit at a time. |
| 5 | Duplicate route, CSV/JSON и Open route in Google Maps | Reuse recurring routes and continue in Google Maps. |

Перед съёмкой:

- используйте вымышленные имена, адреса, телефоны и заметки;
- скройте аватар Google, уведомления, закладки и другие персональные данные;
- установите масштаб браузера 100%;
- снимайте интерфейс без DevTools;
- не добавляйте ложные рейтинги, отзывы, награды или логотип Google;
- проверьте читаемость после уменьшения кадра до 640×400.

### Маленькое рекламное изображение — обязательно

Загрузите:

```text
store/assets/promo-small-440x280.png
```

Параметры: PNG, 440×280 px. Изображение уже соответствует бренду RouteMate и не использует торговые знаки Google.

### Большое рекламное изображение — рекомендуется

Если в панели доступно поле **Marquee / Большое рекламное изображение**, загрузите:

```text
store/assets/promo-marquee-1400x560.png
```

Параметры: PNG, 1400×560 px. Оно не обязательно для обычной публикации, но необходимо для потенциального размещения в большом промо-блоке магазина.

## 3. Глобальный проморолик

Для полностью заполненной карточки подготовьте публичный или **Unlisted** ролик на YouTube. Рекомендуемые параметры: 45–60 секунд, 1920×1080, английские подписи, без защищённой авторским правом музыки. Запишите настоящий интерфейс RouteMate.

### Название ролика

```text
RouteMate — Plan field visits from Google Maps
```

### Описание ролика на YouTube

```text
RouteMate turns places you select in Google Maps into a private field-day plan with visit details, time windows, statuses, schedule warnings, and local route optimization.

No account, ads, analytics, or external backend. Route data stays in Chrome storage on your device.

RouteMate is an independent open-source product and is not affiliated with, endorsed by, or sponsored by Google.
```

### Сценарий на 55 секунд

| Время | Экран | Текст на экране |
|---|---|---|
| 0–4 с | Карта с несколькими запланированными визитами | Multiple visits. One workday. |
| 4–11 с | Открыть место в Google Maps и нажать Add stop | Save the place you are viewing. |
| 11–20 с | Заполнить task, duration, time window и contact | Keep every job detail with the stop. |
| 20–30 с | Добавить точки, перетащить и нажать Optimize | Build and reorder the day locally. |
| 30–39 с | Показать conflict warning и projected finish | Catch schedule conflicts early. |
| 39–47 с | Next visit, Start, Complete, progress | Run the day visit by visit. |
| 47–52 с | Нажать Open route in Google Maps | Continue to navigation when ready. |
| 52–55 с | Логотип RouteMate на зелёном фоне | No account. No tracking. Your route stays in your browser. |

После загрузки вставьте полный URL вида `https://www.youtube.com/watch?v=...` в поле **Глобальный проморолик**. Не используйте ссылку на YouTube Shorts.

## 4. Дополнительные поля карточки

Используйте публичные ссылки:

| Поле | Значение |
|---|---|
| Homepage URL | `https://github.com/lunesko/RouteMate` |
| Support URL | `https://github.com/lunesko/RouteMate/issues` |
| Privacy Policy URL | `https://lunesko.github.io/RouteMate/privacy.html` |
| Mature content | No |

URL должны открываться без авторизации, не возвращать 404 и точно относиться к RouteMate.

## 5. Конфиденциальность

### Единственная цель

Вставьте:

```text
RouteMate lets users save places they deliberately select in Google Maps and organize them into private, reusable field-visit routes.
```

### Обоснование разрешений

**storage**

```text
Used to save routes, visit details, statuses, notes, and settings locally in the user's Chrome profile. No route data is sent to the developer or to an external server.
```

**sidePanel**

```text
Used to display RouteMate's route workspace beside Google Maps while the user plans and manages visits.
```

**Host permissions: `https://www.google.com/maps/*` и `https://maps.google.com/*`**

```text
Used only to read the currently open Google Maps place after the user explicitly clicks Add stop. RouteMate does not scan search results or collect browsing activity in the background.
```

### Удалённый код

Выберите **No, I am not using remote code**.

Пояснение, если поле появится:

```text
All executable JavaScript is packaged with the extension. RouteMate does not download or execute remote code.
```

### Использование данных

Для текущей версии 0.4.0 отметьте, что расширение **не собирает и не передаёт пользовательские данные разработчику или третьим лицам**. Типы данных не отмечайте как собираемые: данные маршрута обрабатываются и хранятся только локально в `chrome.storage.local`.

Подтвердите применимые декларации:

- данные не продаются третьим лицам;
- данные не используются вне основной функции RouteMate;
- данные не используются для кредитоспособности или кредитования;
- человек-разработчик не получает доступ к содержимому маршрутов.

Это описание верно только для текущей версии без аналитики, рекламы, облачной синхронизации и backend. Если позже появится хотя бы одна из этих функций, декларации и Privacy Policy нужно обновить до загрузки новой версии.

### Privacy Policy

Вставьте общедоступный HTTPS URL страницы с содержимым `PRIVACY_POLICY.md`. Не отправляйте на проверку файл с незаполненной датой или незаполненным support email.

## 6. Распространение

| Поле | Рекомендуемое значение |
|---|---|
| Visibility | Public |
| Regions | All regions |
| Pricing | Free |
| In-app purchases | No |
| Mature content | No |
| Target audience | General Chrome users |

Для первой публикации удобно выбрать **deferred/manual publish**, если панель предлагает этот режим: после одобрения можно ещё раз проверить карточку и опубликовать вручную. Не оставляйте одобренную версию в ожидании дольше срока, указанного в панели.

## 7. Инструкции для тестирования

### Требуется ли учётная запись

```text
No account or credentials are required.
```

### Инструкция проверяющему

```text
No account or credentials are required.

1. Install the extension.
2. Open https://www.google.com/maps/.
3. Search for and open any place so its place details are visible.
4. Click the RouteMate toolbar icon to open the side panel.
5. Click "Add stop".
6. Open a second place in Google Maps and add it.
7. Edit status, priority, visit duration, time window, task type, contact, or note.
8. Use Optimize or drag and drop to reorder the route.
9. Click "Open route in Google Maps".

All data remains in chrome.storage.local. The extension does not use an external backend or remote code.
```

## 8. Google Analytics

Не подключайте Google Analytics для первой версии. Оставьте раздел пустым. Это соответствует фактической архитектуре RouteMate и упрощает декларации конфиденциальности.

## 9. Финальная проверка перед кнопкой «Отправить на проверку»

- [ ] Загружен ZIP `dist/routemate-extension-v0.4.0.zip`, а не архив исходников.
- [ ] Выбран English (United States).
- [ ] Категория изменена на Workflow & Planning.
- [ ] Полное описание вставлено без русских фраз и обещаний, которых нет в продукте.
- [ ] Загружены значок 128×128, минимум один реальный скриншот 1280×800 и промо 440×280.
- [ ] YouTube-ролик доступен по ссылке в режиме инкогнито.
- [ ] Homepage, Support и Privacy Policy открываются без входа.
- [ ] В Privacy Policy и Terms заменены дата и support email.
- [ ] Декларации разрешений совпадают с `manifest.json`.
- [ ] Удалённый код: No.
- [ ] Нет аналитики, рекламы, подписки и сбора данных.
- [ ] Инструкция для тестирования вставлена.
- [ ] На скриншотах нет личных данных.
- [ ] Нигде не используется логотип Google и не заявляется партнёрство с Google.
- [ ] Черновик сохранён; все обязательные поля перестали подсвечиваться.

## Официальные требования Chrome

- [Complete your listing information](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Creating a great listing page](https://developer.chrome.com/docs/webstore/best-listing)
- [Supplying images](https://developer.chrome.com/docs/webstore/images)
- [Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)
