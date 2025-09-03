import os
import json


def update_recipe_list():
    """
    Dynamically updates asset/recipes.json with the list of JSON files
    in the recipes directory.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    recipes_dir = os.path.join(script_dir, 'recipes')
    asset_file_path = os.path.join(script_dir, 'asset', 'recipes.json')

    try:
        recipe_files = [
            f"recipes/{file}"
            for file in os.listdir(recipes_dir)
            if file.endswith('.json') and not file.startswith('.')
        ]
    except FileNotFoundError:
        print(f"Error: The directory '{recipes_dir}' was not found.")
        return

    with open(asset_file_path, 'w', encoding='utf-8') as f:
        json.dump(recipe_files, f, indent=4)

    print(f"Successfully updated {asset_file_path} with the new recipe list.")


if __name__ == "__main__":
    update_recipe_list()
