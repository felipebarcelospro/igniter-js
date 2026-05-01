import Ajv from "ajv";
const ajv = new Ajv({ allErrors: true, useDefaults: true });

const schema = {
  "type": "object",
  "properties": {
    "title": { 
      "type": "string", 
      "minLength": 10,
      "description": "SEO-friendly title"
    },
    "published": { 
      "type": "boolean",
      "default": false
    },
    "tags": { 
      "type": "array",
      "items": { "type": "string" }
    },
    "authors": {
      "type": "array",
      "items": { 
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "email": { "type": "string" }
        },
        "required": ["name", "email"]
       }
    }
  },
  "required": ["title"]
};

try {
  console.log("Compiling schema without format...");
  const validate = ajv.compile(schema);
  console.log("Schema compiled successfully!");
} catch (error) {
  console.error("Schema compilation failed:", error);
}