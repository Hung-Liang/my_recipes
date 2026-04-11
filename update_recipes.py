import os
import json


def update_recipe_list():
    """
    Dynamically updates asset/recipes.json and asset/info.json by recursively
    scanning the recipes directory for JSON files.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    recipes_dir = os.path.join(script_dir, 'recipes')
    asset_dir = os.path.join(script_dir, 'asset')
    recipes_list_path = os.path.join(asset_dir, 'recipes.json')
    info_path = os.path.join(asset_dir, 'info.json')

    if not os.path.exists(recipes_dir):
        print(f"Error: The directory '{recipes_dir}' was not found.")
        return

    recipe_summaries = []
    all_tags = set()
    recipe_paths = []

    # Use os.walk to recursively scan for JSON files
    for root, dirs, files in os.walk(recipes_dir):
        for file in files:
            if file.endswith('.json') and not file.startswith('.'):
                file_path = os.path.join(root, file)
                # Calculate relative path from recipes_dir
                rel_path = os.path.relpath(file_path, recipes_dir)
                # Ensure path uses forward slashes for web usage
                web_path = rel_path.replace(os.sep, '/')
                recipe_paths.append(f"recipes/{web_path}")

                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        recipe = json.load(f)
                    
                    # Create summary
                    summary = {
                        "path": web_path,
                        "filename": os.path.splitext(os.path.basename(file))[0],
                        "name": recipe.get("name", "Unknown Recipe"),
                        "description": recipe.get("description", ""),
                        "tags": recipe.get("tags", [])
                    }
                    
                    if recipe.get("tags"):
                        all_tags.update(recipe["tags"])
                    
                    recipe_summaries.append(summary)
                    
                except (json.JSONDecodeError, FileNotFoundError) as e:
                    print(f"Warning: Could not process {file}: {e}")
                    continue

    # Create info.json structure
    info_data = {
        "recipes": recipe_summaries,
        "allTags": sorted(list(all_tags)),
        "totalRecipes": len(recipe_summaries),
        "lastUpdated": None
    }
    
    with open(recipes_list_path, 'w', encoding='utf-8') as f:
        json.dump(recipe_paths, f, indent=4)
    
    with open(info_path, 'w', encoding='utf-8') as f:
        json.dump(info_data, f, indent=4, ensure_ascii=False)

    print(f"Successfully updated {info_path} with {len(recipe_summaries)} recipes.")



if __name__ == "__main__":
    update_recipe_list()
