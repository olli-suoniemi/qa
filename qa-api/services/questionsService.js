import { sql } from "../util/databaseConnect.js";

// --- Courses ---

// Fetch all available courses
export const getAllCourses = async () => {
  try {
    const result = await sql`SELECT * FROM courses ORDER BY name ASC`;
    return result;
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
};

// Fetch course by id
export const getCourseById = async (id) => {
  try {
    const result = await sql`SELECT * FROM courses WHERE id = ${id}`;
    return result;
  } catch (error) {
    console.error("Error fetching course:", error);
    throw error;
  }
};

// --- Questions ---

// Add a new question to the database
export const addQuestion = async (newQuestion) => {
  try {
    const { courseID, questionText, userID, createdAt, lastUpdated } = newQuestion;
    const result = await sql`
      INSERT INTO questions (course_id, content, user_id, created_at, last_updated)
      VALUES (${courseID}, ${questionText}, ${userID}, ${createdAt}, ${lastUpdated})
      RETURNING id
    `;
    return result[0]; // Return the question ID
  } catch (error) {
    console.error("Error adding question:", error);
    throw error;
  }
};

// Get the most recent question posted by a user (for rate-limiting)
export const getLastQuestionTime = async (userID) => {
  
  try {
    const result = await sql`
      SELECT created_at FROM questions
      WHERE user_id = ${userID}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return result.length > 0 ? new Date(result[0].created_at).getTime() : null;
  } catch (error) {
    console.error("Error fetching last question time:", error);
    throw error;
  }
};


// Fetch all questions for a specific course with pagination, including upvote count
export const getQuestions = async (courseID, page, limit) => {
  const offset = (page - 1) * limit;
  try {
    const result = await sql`
      SELECT q.*, COUNT(u.id) AS upvote_count
      FROM questions q
      LEFT JOIN upvotes u ON u.entity_type = 'question' AND u.entity_id = q.id
      WHERE q.course_id = ${courseID}
      GROUP BY q.id
      ORDER BY COALESCE(MAX(u.created_at), q.created_at) DESC, q.last_updated DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return result;
  } catch (error) {
    console.error("Error fetching questions:", error);
    throw error;
  }
};



// Fetch a specific question by its ID
export const getQuestionById = async (questionID) => {
  try {
    const result = await sql`
      SELECT * FROM questions
      WHERE id = ${questionID}
    `;
    return result[0] || null; // Return the question or null if not found
  } catch (error) {
    console.error("Error fetching question by ID:", error);
    throw error;
  }
};

// --- Answers ---

// Add a new answer to a question
export const addAnswer = async (newAnswer) => {
  try {
    const { questionID, answerText, userID, createdAt, lastUpdated, isLLMGenerated } = newAnswer;
    const result = await sql`
      INSERT INTO answers (question_id, content, user_id, created_at, last_updated, is_llm_generated)
      VALUES (${questionID}, ${answerText}, ${userID}, ${createdAt}, ${lastUpdated}, ${isLLMGenerated})
      RETURNING id
    `;
    return result[0];
  } catch (error) {
    console.error("Error adding answer:", error);
    throw error;
  }
};

// Get the most recent answer posted by a user (for rate-limiting)
export const getLastAnswerTime = async (userID) => {
  try {
    const result = await sql`
      SELECT created_at FROM answers
      WHERE user_id = ${userID}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return result.length > 0 ? new Date(result[0].created_at).getTime() : null;
  } catch (error) {
    console.error("Error fetching last answer time:", error);
    throw error;
  }
};

// Fetch all answers for a specific question along with upvote counts
export const getAnswersByQuestionId = async (questionID, page, limit) => {
  const offset = (page - 1) * limit;
  try {
    const result = await sql`
      SELECT a.*, COUNT(u.id) AS upvote_count, COALESCE(MAX(u.created_at), a.created_at) AS recent_time
      FROM answers a
      LEFT JOIN upvotes u ON u.entity_type = 'answer' AND u.entity_id = a.id
      WHERE a.question_id = ${questionID}
      GROUP BY a.id
      ORDER BY recent_time DESC, a.last_updated DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return result;
  } catch (error) {
    console.error("Error fetching answers for question:", error);
    throw error;
  }
};



// --- Upvotes ---

// Check if a user has upvoted a question
export const hasUserUpvotedQuestion = async (userID, questionID) => {
  try {
    const result = await sql`
      SELECT id FROM upvotes
      WHERE user_id = ${userID} AND entity_type = 'question' AND entity_id = ${questionID}
    `;
    return result.length > 0;
  } catch (error) {
    console.error("Error checking question upvote:", error);
    throw error;
  }
};

// Increment upvote count for a question and update its last_updated timestamp
export const upvoteQuestion = async (userID, questionID) => {
  try {
    // Check if the user has already upvoted this question
    const hasUpvoted = await hasUserUpvotedQuestion(userID, questionID);
    if (hasUpvoted) {
      return { success: false, message: "User has already upvoted this question." };
    }

    // Insert the upvote record into the upvotes table
    await sql`
      INSERT INTO upvotes (entity_type, user_id, entity_id, created_at)
      VALUES ('question', ${userID}, ${questionID}, NOW())
    `;
    
    // Update the last_updated timestamp of the question
    await sql`
      UPDATE questions
      SET last_updated = NOW()
      WHERE id = ${questionID}
    `;

    return { success: true };
  } catch (error) {
    console.error("Error upvoting question:", error);
    throw error;
  }
};


// Check if a user has upvoted an answer
export const hasUserUpvotedAnswer = async (userID, answerID) => {
  try {
    const result = await sql`
      SELECT id FROM upvotes
      WHERE user_id = ${userID} AND entity_type = 'answer' AND entity_id = ${answerID}
    `;
    return result.length > 0;
  } catch (error) {
    console.error("Error checking answer upvote:", error);
    throw error;
  }
};

// Increment upvote count for an answer
export const upvoteAnswer = async (userID, answerID) => {
  try {
    // Check if the user has already upvoted this answer
    const hasUpvoted = await hasUserUpvotedAnswer(userID, answerID);
    if (hasUpvoted) {
      return { success: false, message: "User has already upvoted this answer." };
    }

    // Insert the upvote record into the upvotes table
    await sql`
      INSERT INTO upvotes (entity_type, user_id, entity_id, created_at)
      VALUES ('answer', ${userID}, ${answerID}, NOW())
    `;

    // Update the last_updated timestamp of the answer
    await sql`
      UPDATE answers
      SET last_updated = NOW()
      WHERE id = ${answerID}
    `;
    
    return { success: true };
  } catch (error) {
    console.error("Error upvoting answer:", error);
    throw error;
  }
};
