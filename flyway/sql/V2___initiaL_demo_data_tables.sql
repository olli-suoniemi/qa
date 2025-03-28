-- Insert sample courses
INSERT INTO courses (name, description) VALUES 
('Mathematics 101', 'Introductory course to basic mathematics concepts'),
('Computer Science 201', 'Data structures and algorithms course'),
('Physics 301', 'Advanced theoretical physics'),
('History 101', 'World history from the 19th century to present');

-- Insert sample questions for courses
-- Ensure user_id corresponds to existing users in your user table
INSERT INTO questions (course_id, content, user_id, created_at) VALUES 
(1, 'What is the formula for calculating the area of a circle?', 1, NOW()), 
(2, 'What is the time complexity of binary search?', 1, NOW()), 
(3, 'What is quantum entanglement?', 1, NOW()), 
(4, 'What caused World War I?', 1, NOW());

-- Insert sample answers for questions
INSERT INTO answers (question_id, content, user_id, created_at, is_llm_generated) VALUES 
(1, 'The formula for the area of a circle is A = πr², where r is the radius.', 1, NOW(), FALSE),
(1, 'Area of a circle is calculated using the formula A = πr², where π is approximately 3.14159.', 2, NOW(), TRUE), 
(2, 'The time complexity of binary search is O(log n).', 1, NOW(), FALSE),
(3, 'Quantum entanglement is a phenomenon where two particles remain interconnected, such that the state of one affects the other, no matter the distance between them.', 2, NOW(), TRUE), 
(4, 'World War I was caused by a combination of political, military, and economic factors, including nationalism, imperialism, and militarism.', 1, NOW(), FALSE);

-- Insert sample upvotes for questions
INSERT INTO upvotes (entity_type, entity_id, user_id, created_at) VALUES 
('question', 1, 1, NOW()), 
('question', 1, 1, NOW()),  
('question', 2, 2, NOW());  

-- Insert sample upvotes for answers
INSERT INTO upvotes (entity_type, entity_id, user_id, created_at) VALUES 
('answer', 1, 1, NOW()), 
('answer', 2, 2, NOW()),   
('answer', 3, 1, NOW()),   
('answer', 4, 2, NOW()),   
('answer', 5, 1, NOW());  
