# The JSON tool definitions passed to the LLM

mrpl_tools = [
    {
        'type': 'function',
        'function': {
            'name': 'draft_word_document',
            'description': 'Draft an official approval note or report based on extracted findings and save it as a Word document.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'title': {
                        'type': 'string', 
                        'description': 'The title of the approval note.'
                    },
                    'key_findings': {
                        'type': 'array', 
                        'items': {'type': 'string'}, 
                        'description': 'A list of main points or anomalies found in the source text or image.'
                    },
                    'filename': {
                        'type': 'string', 
                        'description': 'The output filename. Must end in .docx'
                    }
                },
                'required': ['title', 'key_findings', 'filename']
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'run_engineering_calculation',
            'description': 'Execute Python code to solve math, logic, or engineering problems. The code must print() the final answer.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'python_code': {
                        'type': 'string', 
                        'description': 'Valid Python code to execute. Use print() to output the final result. You have access to math, numpy, and sympy.'
                    }
                },
                'required': ['python_code']
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'analyze_document_vision',
            'description': 'Read, parse, and extract information from scanned PDFs, P&ID diagrams, handwritten notes, or images.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'file_path': {
                        'type': 'string', 
                        'description': 'The local filename to read (e.g., report.pdf, diagram.png)'
                    },
                    'query': {
                        'type': 'string',
                        'description': 'Specific question about what to extract or look for in the visual document.'
                    }
                },
                'required': ['file_path', 'query']
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'search_knowledge_base',
            'description': "Search the organization's local knowledge base of ingested documents, SOPs, manuals, and past correspondence to find relevant information. Use this when the user asks about internal procedures, past reports, or any topic that may be covered in uploaded documents.",
            'parameters': {
                'type': 'object',
                'properties': {
                    'query': {
                        'type': 'string',
                        'description': 'The search query describing what information to find in the knowledge base.'
                    }
                },
                'required': ['query']
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'generate_excel_report',
            'description': 'Create a formatted Excel spreadsheet report with headers and data rows. Use for tabular data, calculations, inventory lists, or any structured data output.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'title': {
                        'type': 'string',
                        'description': 'The title of the report, displayed as a header row.'
                    },
                    'headers': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'Column header names for the spreadsheet.'
                    },
                    'rows': {
                        'type': 'array',
                        'items': {
                            'type': 'array',
                            'items': {'type': 'string'}
                        },
                        'description': 'Array of rows, each row is an array of cell values matching the headers.'
                    },
                    'filename': {
                        'type': 'string',
                        'description': 'Output filename. Must end in .xlsx'
                    }
                },
                'required': ['title', 'headers', 'rows', 'filename']
            }
        }
    }
]