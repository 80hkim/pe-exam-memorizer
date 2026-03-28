import fitz
import sys
import os

pdf_path = "기술사 답안양식.pdf"
output_dir = "public"

try:
    doc = fitz.open(pdf_path)
    for i in range(len(doc)):
        page = doc.load_page(i)
        # Use high resolution (e.g. 3x)
        pix = page.get_pixmap(matrix=fitz.Matrix(3, 3))
        out_path = os.path.join(output_dir, f"answer_form_page_{i+1}.png")
        pix.save(out_path)
        print(f"Saved {out_path}")
    print("Done extracting!")
except Exception as e:
    print(f"Error: {e}")
