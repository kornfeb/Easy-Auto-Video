import re

def natural_sort_key(s):
    """
    Helper for natural sorting of strings containing numbers.
    e.g. ['1.jpg', '2.jpg', '10.jpg'] instead of ['1.jpg', '10.jpg', '2.jpg']
    """
    return [int(text) if text.isdigit() else text.lower() for text in re.split('([0-9]+)', s)]

def sort_images_naturally(images):
    """Sorts a list of image filenames naturally and case-insensitively."""
    return sorted(images, key=natural_sort_key)
