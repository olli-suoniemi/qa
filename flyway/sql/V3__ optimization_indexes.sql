--- Composite index on entity_type, entity_id and created_at
CREATE INDEX idx_upvotes_entity_created_at ON upvotes (entity_type, entity_id, created_at);


--- Composite index on both user_id and created_at on answers
CREATE INDEX idx_answers_user_id_created_at ON answers (user_id, created_at);


--- Index on courses.name
CREATE INDEX idx_courses_name ON courses (name);


--- Composite index on both user_id and created_at on questions
CREATE INDEX idx_questions_user_created_at ON questions (user_id, created_at);

