import os
import ollama
from backend.tools.schemas import mrpl_tools
from backend.tools.doc_generator import draft_word_document
from backend.tools.excel_generator import generate_excel_report
from backend.agent.sandbox import run_engineering_calculation
from backend.ingestion.pdf_parser import analyze_document_vision
from backend.ingestion.rag import search_knowledge_base
from backend.agent.router import get_routing_decision

MODEL_NAME = os.environ.get("MODEL_NAME", "qwen3.5:9b")
client = ollama.Client(host=os.environ.get("OLLAMA_HOST", "http://localhost:11434"))

AVAILABLE_TOOLS = {
    'draft_word_document': draft_word_document,
    'run_engineering_calculation': run_engineering_calculation,
    'analyze_document_vision': analyze_document_vision,
    'search_knowledge_base': search_knowledge_base,
    'generate_excel_report': generate_excel_report,
}


def execute_agent_task(user_prompt: str, history: list = None):
    """
    Generator that yields SSE event dicts as the agent works.
    Each yielded value is a dict like:
        {"type": "routing", "model": "...", "task_type": "..."}
        {"type": "tool_call", "tool": "...", "args": {...}}
        {"type": "tool_result", "tool": "...", "result": "..."}
        {"type": "answer", "content": "..."}
        {"type": "error", "content": "..."}
        {"type": "token_usage", "prompt_tokens": X, "completion_tokens": Y, "total_tokens": Z}
    """
    # Step 1: Route the task
    try:
        decision = get_routing_decision(user_prompt)
        selected_model = decision.get("model", MODEL_NAME)
        task_type = decision.get("task_type", "text")
        yield {"type": "routing", "model": selected_model, "task_type": task_type}
    except Exception as e:
        selected_model = MODEL_NAME
        yield {"type": "routing", "model": selected_model, "task_type": "text"}

    # Step 2: Agentic loop
    system_prompt = (
        "You are the Sovereign AI Workbench agent — a confidential, air-gapped AI assistant for industrial engineers. "
        "You help with document analysis, engineering calculations, report drafting, and knowledge base search. "
        "You have access to tools. Always be precise, professional, and thorough. Never mention external services or cloud APIs."
    )
    messages = [{'role': 'system', 'content': system_prompt}]
    if history:
        messages.extend(history)
    messages.append({'role': 'user', 'content': user_prompt})

    prompt_tokens = 0
    completion_tokens = 0

    for iteration in range(5):
        print(f"\n--- Agent Iteration {iteration + 1} ({selected_model}) ---")

        try:
            response = client.chat(
                model=selected_model,
                messages=messages,
                tools=mrpl_tools
            )
            prompt_tokens += response.get('prompt_eval_count', 0)
            completion_tokens += response.get('eval_count', 0)
        except Exception as e:
            print(f"[AGENT ERROR] Model call failed: {e}")
            yield {"type": "error", "content": f"Model call failed: {str(e)}"}
            return

        message_out = response['message']
        messages.append(message_out)

        if message_out.get('tool_calls'):
            for tool_call in message_out['tool_calls']:
                func_name = tool_call['function']['name']
                arguments = tool_call['function']['arguments']

                print(f"[EXECUTING TOOL] {func_name}")
                yield {"type": "tool_call", "tool": func_name, "args": arguments}

                if func_name in AVAILABLE_TOOLS:
                    try:
                        tool_result = AVAILABLE_TOOLS[func_name](**arguments)
                    except Exception as e:
                        tool_result = f"Error executing tool: {str(e)}"
                else:
                    tool_result = f"Error: Tool '{func_name}' is not recognized."

                # Truncate for SSE display, full result stays in message history
                yield {
                    "type": "tool_result",
                    "tool": func_name,
                    "result": str(tool_result)[:500]
                }

                messages.append({
                    'role': 'tool',
                    'content': str(tool_result),
                    'name': func_name
                })

            # Continue the loop so the model can read tool results
            continue

        else:
            # No tool calls — this is the final answer
            print("\n[FINAL ANSWER DELIVERED]")
            yield {
                "type": "token_usage", 
                "prompt_tokens": prompt_tokens, 
                "completion_tokens": completion_tokens, 
                "total_tokens": prompt_tokens + completion_tokens
            }
            yield {"type": "answer", "content": message_out.get('content', '')}
            return

    yield {
        "type": "token_usage", 
        "prompt_tokens": prompt_tokens, 
        "completion_tokens": completion_tokens, 
        "total_tokens": prompt_tokens + completion_tokens
    }
    yield {"type": "error", "content": "Agent reached maximum iterations without completing the task."}


if __name__ == "__main__":
    task = (
        "Read the scanned document at 'inspection_report.pdf'. "
        "Extract the key findings regarding the pressure valves, "
        "and draft an approval note based on those findings saved "
        "as 'valve_approval.docx'."
    )

    for event in execute_agent_task(task):
        print(f"[EVENT] {event}")
