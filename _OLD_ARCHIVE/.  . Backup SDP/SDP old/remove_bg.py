from PIL import Image

def remove_white_background(input_path, output_path):
    print(f"Processing {input_path}...")
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        
        datas = img.getdata()
        
        newData = []
        for item in datas:
            # Check if pixel is white (or very light grey)
            # R > 240, G > 240, B > 240
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                newData.append((255, 255, 255, 0)) # Transparent
            else:
                newData.append(item)
        
        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Successfully saved to {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    remove_white_background("assets/logo.png", "assets/logo.png")
