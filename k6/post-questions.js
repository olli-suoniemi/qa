import http from "k6/http";
import { crypto } from 'k6/experimental/webcrypto';

export const options = {
  duration: "10s",
  vus: 10,
};

export default function () {
  
  const newQuestion = { 
    courseID: 1,
    question: "Am I a robot?",
    user: crypto.randomUUID().toString(),
  };

  http.post(
    "http://local.production/api/question",
    JSON.stringify(newQuestion),
  );
}