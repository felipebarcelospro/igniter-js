Introduction
SVGL API is a RESTFul API that allows you to get all the information of the SVGs that are in the repository.

Limitations
The API is currently open to everyone and does not require any authentication. However, to prevent abusive use of the API, there is a limit to the number of requests.

Don't use the API for create the same product as SVGL. The API is intended to be used for extensions, plugins, or other tools that can help the community.
Base URL
The base URL for the API is:

https://api.svgl.app
# or
https://api.svgl.app/categories
Typescript usage
For categories:
export interface Category {
  category: string;
  total: number;
}
For SVGs:
export type ThemeOptions = {
  dark: string;
  light: string;
};

export interface iSVG {
  id?: number;
  title: string;
  category: tCategory | tCategory[];
  route: string | ThemeOptions;
  wordmark?: string | ThemeOptions;
  brandUrl?: string;
  url: string;
}
tCategory is a large list of categories that can be found here.
Endpoints

Get all SVGs
Returns all the SVGs in the repository.

https://api.svgl.app
// Returns:
[
  {
    "id": 0,
    "title": "Discord",
    "category": "Software",
    "route": "https://svgl.app/discord.svg",
    "url": "https://discord.com/"
  },
  ...
]

Get a limited number of SVGs
Returns a limited number of SVGs in the repository. Start from the first SVG.

https://api.svgl.app?limit=10
// Returns:
[
  {
    "id": 0,
    "title": "Discord",
    "category": "Software",
    "route": "https://svgl.app/discord.svg",
    "url": "https://discord.com/"
  },
  ...
]

Filter SVGs by category
Returns all the SVGs in the repository that match the category.

https://api.svgl.app/category/software
// Returns:
[
  {
    "id": 0,
    "title": "Discord",
    "category": "Software",
    "route": "https://svgl.app/discord.svg",
    "url": "https://discord.com/"
  },
  ...
]
The list of categories is available here (except for the all category).


Get only categories
Returns only categories with the number of SVGs in each category.

https://api.svgl.app/categories
// Returns:
[
  {
    "category": "Software",
    "total": 97
  },
  {
    "category": "Library",
    "total": 25
  },
  ...
]

Search SVGs by name
Returns all the SVGs in the repository that match the name.

https://api.svgl.app?search=axiom
// Returns:
[
  {
    "id": 267,
    "title": "Axiom",
    "category": "Software",
    "route": {
      "light": "https://svgl.app/axiom-light.svg",
      "dark": "https://svgl.app/axiom-dark.svg"
    },
    "url": "https://axiom.co/"
  }
]
