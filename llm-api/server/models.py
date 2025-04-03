from openai import OpenAI

# Read the secret from the Docker secrets file
def get_openai_api_key():
    secret_file_path = '/run/secrets/OPENAI_API_KEY'
    try:
        with open(secret_file_path, 'r') as secret_file:
            return secret_file.read().strip()  
    except FileNotFoundError:
        raise Exception(f"Secret file {secret_file_path} not found")

# Use the secret API key
client = OpenAI(
    api_key=get_openai_api_key(),
)

# Function to generate a response from the OpenAI model
def generate_response(question):
    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            instructions="You are a Q&A bot. Answer the question as best as you can. Keep the answer short.",
            input=question,
        )

        return {"status": True, "message": response.output_text}
    
    except openai.APIConnectionError as e:
        print("The server could not be reached")
        print(e.__cause__)
        return {"status": False, "message": "The LLM server could not be reached"}
    except openai.RateLimitError as e:
        print("A 429 status code was received; we should back off a bit.")
        return {"status": False, "message": "A 429 status code was received from LLM; we should back off a bit."}
    except openai.APIStatusError as e:
        print("Another non-200-range status code was received")
        print(e.status_code)
        print(e.response)
        return {"status": False, "message": "Non-200-range status code was received from LLM"}
