-- Table for storing courses
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- Table for storing questions
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Table for storing answers
CREATE TABLE answers (
    id SERIAL PRIMARY KEY,
    question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP DEFAULT NOW(),
    is_llm_generated BOOLEAN DEFAULT FALSE
);

-- Table for storing upvotes for questions and answers
CREATE TABLE upvotes (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(10) CHECK (entity_type IN ('question', 'answer')),
    entity_id INT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index on foreign key questions.course_id
CREATE INDEX idx_questions_course_id ON questions(course_id);

-- Index on foreign key answers.question_id
CREATE INDEX idx_answers_question_id ON answers(question_id);

-- Composite index on upvotes entity_type and entity_id
CREATE INDEX idx_upvotes_entity ON upvotes(entity_type, entity_id);
