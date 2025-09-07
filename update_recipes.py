import os
import json


def update_recipe_list():
    """
    Dynamically updates asset/recipes.json with the list of JSON files
    in the recipes directory and creates asset/Info.json with recipe summaries.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    recipes_dir = os.path.join(script_dir, 'recipes')
    asset_dir = os.path.join(script_dir, 'asset')
    recipes_list_path = os.path.join(asset_dir, 'recipes.json')
    info_path = os.path.join(asset_dir, 'Info.json')

    try:
        recipe_files = [
            file for file in os.listdir(recipes_dir)
            if file.endswith('.json') and not file.startswith('.')
        ]
    except FileNotFoundError:
        print(f"Error: The directory '{recipes_dir}' was not found.")
        return

    # Generate recipe file list (for backward compatibility)
    recipe_paths = [f"recipes/{file}" for file in recipe_files]
    
    # Generate recipe summaries for Info.json
    recipe_summaries = []
    all_tags = set()
    
    for file in recipe_files:
        file_path = os.path.join(recipes_dir, file)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                recipe = json.load(f)
            
            # Extract filename without extension
            filename = os.path.splitext(file)[0]
            
            # Create summary
            summary = {
                "filename": filename,
                "name": recipe.get("name", "Unknown Recipe"),
                "description": recipe.get("description", ""),
                "tags": recipe.get("tags", [])
            }
            
            # Collect all tags
            if recipe.get("tags"):
                all_tags.update(recipe["tags"])
            
            recipe_summaries.append(summary)
            
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Warning: Could not process {file}: {e}")
            continue
    
    # Create Info.json structure
    info_data = {
        "recipes": recipe_summaries,
        "allTags": sorted(list(all_tags)),
        "totalRecipes": len(recipe_summaries),
        "lastUpdated": None  # Will be set by JavaScript Date()
    }
    
    # Write recipes.json (for backward compatibility)
    with open(recipes_list_path, 'w', encoding='utf-8') as f:
        json.dump(recipe_paths, f, indent=4)
    
    # Write Info.json
    with open(info_path, 'w', encoding='utf-8') as f:
        json.dump(info_data, f, indent=4, ensure_ascii=False)

    print(f"Successfully updated {recipes_list_path} with "
          f"{len(recipe_files)} recipes.")
    print(f"Successfully created {info_path} with recipe summaries and "
          f"{len(all_tags)} unique tags.")


if __name__ == "__main__":
    update_recipe_list()
