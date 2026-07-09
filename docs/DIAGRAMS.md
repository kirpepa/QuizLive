# Диаграммы (Mermaid) для Miro

Как использовать: в Miro на левой панели → **Apps** → найди **Mermaid** →
вставь любой блок кода ниже → диаграмма построится автоматически. Каждый блок —
отдельная диаграмма (вставляй по одному).

---

## 1. Модель базы данных (ER-диаграмма)

```mermaid
erDiagram
    User ||--o{ Quiz : "создаёт"
    User ||--o{ SessionParticipant : "участвует как"
    Quiz ||--o{ Question : "содержит"
    Quiz ||--o{ QuizSession : "запускается как"
    Question ||--o{ AnswerOption : "имеет"
    QuizSession ||--o{ SessionParticipant : "включает"
    QuizSession ||--o{ ParticipantAnswer : "фиксирует"
    Question ||--o{ ParticipantAnswer : "получает"
    SessionParticipant ||--o{ ParticipantAnswer : "даёт"

    User {
        string id PK
        string email UK
        string passwordHash
        string role "organizer | participant"
        string nickname
        datetime createdAt
    }
    Quiz {
        string id PK
        string ownerId FK
        string title
        string description
        string category
        int defaultTimePerQuestion
        boolean allowAnswerChange
        boolean speedBonus
    }
    Question {
        string id PK
        string quizId FK
        string type "text | image"
        string answerType "single | multiple"
        string text
        string imageUrl "nullable"
        int timeLimit "nullable"
        int orderIndex
    }
    AnswerOption {
        string id PK
        string questionId FK
        string text
        boolean isCorrect
        int orderIndex
    }
    QuizSession {
        string id PK
        string quizId FK
        string roomCode UK
        string status "pending | active | finished"
        datetime startedAt
        datetime finishedAt
    }
    SessionParticipant {
        string id PK
        string sessionId FK
        string userId FK "nullable (гость)"
        string nickname
        int score
    }
    ParticipantAnswer {
        string id PK
        string sessionId FK
        string questionId FK
        string participantId FK
        string selectedOptionIds "JSON"
        boolean isCorrect
        int scoreAwarded
        datetime answeredAt
    }
```

---

## 2. Пользовательский сценарий (User Flow)

```mermaid
flowchart TD
    Start([Пользователь открывает VK Квиз]) --> Role{Кто он?}

    Role -->|Организатор| Login[Вход / Регистрация]
    Login --> Dash[Личный кабинет:<br/>список квизов и история]
    Dash --> Create[Создать квиз]
    Create --> Editor[Редактор:<br/>настройки + вопросы<br/>текст/изображение,<br/>одиночный/множественный]
    Editor --> Launch[Запустить квиз]
    Launch --> Room[Панель ведущего:<br/>код комнаты]
    Room --> WaitP[Ждёт участников]
    WaitP --> StartQuiz[Начать квиз]
    StartQuiz --> Host[Показывает вопросы,<br/>открывает ответ,<br/>ведёт к следующему]
    Host --> HostEnd[Финальный лидерборд<br/>+ сохранение в историю]

    Role -->|Участник| Join[Ввод кода комнаты + имя<br/>регистрация не обязательна]
    Join --> Lobby[Лобби: ждёт старта]
    Lobby --> Play[Отвечает на вопросы<br/>на скорость по таймеру]
    Play --> Reveal[Видит правильный ответ<br/>+ промежуточный лидерборд]
    Reveal -->|есть ещё вопросы| Play
    Reveal -->|вопросы кончились| PartEnd[Финальный лидерборд<br/>+ место в истории участия]

    StartQuiz -.транслирует вопрос.-> Play
    Play -.отправляет ответ.-> Host
```

---

## 3. Проведение квиза в реальном времени (Sequence)

```mermaid
sequenceDiagram
    participant O as Организатор
    participant S as Сервер (Socket.IO)
    participant P as Участник

    O->>S: organizer:open (создаёт/открывает комнату)
    P->>S: room:join (код + имя)
    S-->>O: room:participants (обновлённый список)
    O->>S: quiz:start
    S-->>P: question:show (вопрос без правильного ответа + дедлайн)
    S-->>O: question:show
    P->>S: question:answer (в пределах времени)
    S-->>O: question:progress (сколько ответили)
    Note over S: Серверный таймер — источник истины.<br/>Поздние ответы отклоняются.
    S->>S: таймаут ИЛИ все ответили
    S-->>P: question:reveal + question:result (баллы)
    S-->>O: question:reveal (правильный ответ + лидерборд)
    O->>S: quiz:next
    Note over S,P: повтор для каждого вопроса
    O->>S: quiz:next (после последнего)
    S-->>O: quiz:finish (финальный лидерборд)
    S-->>P: quiz:finish
    S->>S: сохранение результатов в БД
```

---

## 4. Архитектура системы (компоненты)

```mermaid
flowchart LR
    subgraph Client["Клиент — React + Vite"]
        UI[Экраны: кабинет, редактор,<br/>ведущий, игрок]
    end

    subgraph Server["Сервер — Node.js + Express"]
        REST[REST API<br/>auth / quizzes / sessions / me]
        WS[Socket.IO<br/>живое состояние комнат]
        Upload[Хранилище<br/>изображений /uploads]
    end

    DB[(SQLite<br/>через Prisma)]

    UI -->|REST + JWT| REST
    UI <-->|WebSocket| WS
    UI -->|загрузка/показ картинок| Upload
    REST --> DB
    WS --> DB
```
