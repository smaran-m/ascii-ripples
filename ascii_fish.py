import tkinter as tk
import time
import math
import random

# List to keep track of active ripples
ripples = []

# Fish variables
NUM_SEGMENTS = 10
SEGMENT_LENGTH = 15  # Fixed distance between segments
fish_positions = []
fish_sizes = []
fish_char_set = " ░▒▓█"  # Characters representing increasing sizes

# Mode variables
follow_cursor = True
target_point = None  # Stores the target point when not following the cursor
last_target_time = 0  # Timestamp of the last target point generation
TARGET_INTERVAL = 2  # Time interval (in seconds) between target generations

# Initialize fish positions and sizes
def initialize_fish():
    global fish_positions, fish_sizes
    fish_positions = [(canvas_width // 2, canvas_height // 2) for _ in range(NUM_SEGMENTS)]
    # Sizes increase to midpoint and then decrease
    fish_sizes = []
    half_length = (NUM_SEGMENTS - 1) / 2
    for i in range(NUM_SEGMENTS):
        if i <= half_length:
            size = int(i / half_length * (len(fish_char_set) - 1))
        else:
            size = int((NUM_SEGMENTS - 1 - i) / half_length * (len(fish_char_set) -1))
        fish_sizes.append(size)

def amplitude_to_color(amplitude):
    # Normalize amplitude
    # acceptable value between 127 and 255
    color_value = int((amplitude + 1) / 2 * 255)
    color_value = max(127, min(255, color_value))

    # You can style the color here; currently, it's a shade of grey-blue
    return f'#{color_value:02x}{color_value:02x}{220:02x}'

def update_canvas():
    canvas.delete("all")
    current_time = time.time()
    cell_width = 10
    cell_height = 20
    canvas_width = canvas.winfo_width()
    canvas_height = canvas.winfo_height()
    cols = canvas_width // cell_width
    rows = canvas_height // cell_height

    # Ripple character set
    ripple_char_set = "-∘◦•○◎◍●◉⬤"

    # max amplitude for normalization (adjust as needed)
    max_amplitude = 2  # Haven't tested higher values, but should work

    # Update fish positions
    update_fish_positions()

    # Draw ripples and fish
    for col in range(cols):
        for row in range(rows):
            cell_x = col * cell_width + cell_width // 2
            cell_y = row * cell_height + cell_height // 2

            # Check if this cell is occupied by the fish
            fish_char = get_fish_char_at_position(cell_x, cell_y)
            if fish_char:
                # Draw fish character
                canvas.create_text(cell_x, cell_y, text=fish_char, font=("Courier", 12), fill="#6699CC")
                continue  # Skip drawing ripples at this cell

            # Draw the target point if it exists
            #if target_point and abs(cell_x - target_point[0]) < cell_width // 2 and abs(cell_y - target_point[1]) < cell_height // 2:
            #    canvas.create_text(cell_x, cell_y, text='◓', font=("Courier", 12), fill="red")
                continue  # Skip drawing ripples at this cell

            # Draw the red ◓ at the cursor position in follow cursor mode
            if follow_cursor:
                mouse_x, mouse_y = root.winfo_pointerx() - root.winfo_rootx(), root.winfo_pointery() - root.winfo_rooty()
                # Align mouse position to the grid
                cursor_col = int(mouse_x // cell_width)
                cursor_row = int(mouse_y // cell_height)
                cursor_x = cursor_col * cell_width + cell_width // 2
                cursor_y = cursor_row * cell_height + cell_height // 2
                if abs(cell_x - cursor_x) < cell_width // 2 and abs(cell_y - cursor_y) < cell_height // 2:
                    canvas.create_text(cell_x, cell_y, text='◓', font=("Courier", 12), fill="red")
                    continue  # Skip drawing ripples at this cell

            total_amplitude = 0  # Initialize amplitude

            for ripple in ripples:
                dx = cell_x - ripple['x']
                dy = cell_y - ripple['y']
                distance = math.hypot(dx, dy)
                elapsed = current_time - ripple['time']

                # Ripple parameters
                speed = ripple['speed']              # Speed of the ripple expansion
                height = ripple['height']            # Height of the wave (affects amplitude)
                wavelength = ripple['wavelength']    # Wavelength
                thickness = ripple['thickness']      # Thickness of the ripple wavefront

                # Calculate the phase of the wave at this point
                phase = (distance - speed * elapsed) * (2 * math.pi / wavelength)

                # Calculate the amplitude using cosine function
                amplitude = height * math.cos(phase) * (1/(1 + elapsed))

                # Consider the ripple if the point is within its active area
                if abs(distance - speed * elapsed) < thickness:
                    total_amplitude += amplitude

            # If total amplitude is negligible, skip drawing
            if abs(total_amplitude) < 0.01:
                continue

            # Map total amplitude to character set index
            # Normalize total amplitude to range 0 to len(char_set) - 1
            # Use tanh to handle cases where total_amplitude exceeds expected values
            normalized_amplitude = math.tanh(total_amplitude)
            normalized_amplitude = (normalized_amplitude + 1) / 2  # Now between 0 and 1
            index = int(normalized_amplitude * (len(ripple_char_set) - 1))
            index = max(0, min(len(ripple_char_set) - 1, index))  # Clamp index to valid range
            char = ripple_char_set[index]

            # Draw the character
            color = amplitude_to_color(amplitude)
            canvas.create_text(cell_x, cell_y, text=char, font=("Courier", 12), fill=color)

    # Remove ripples that have expanded beyond the window
    ripples[:] = [
        ripple for ripple in ripples
        if (current_time - ripple['time']) * ripple['speed'] < max(canvas_width, canvas_height) * 1.5
    ]

    # Schedule the next update
    root.after(30, update_canvas)

def get_fish_char_at_position(x, y):
    # Check if the (x, y) is close to any fish segment
    for i, pos in enumerate(fish_positions):
        fx, fy = pos
        dx = x - fx
        dy = y - fy
        distance = math.hypot(dx, dy)
        if distance < 10:  # Adjust as needed
            size_index = fish_sizes[i]
            return fish_char_set[size_index]
    return None

def update_fish_positions():
    global target_point, last_target_time
    current_time = time.time()
    # Update positions to follow the mouse cursor or move towards the target point
    if follow_cursor:
        mouse_x, mouse_y = root.winfo_pointerx() - root.winfo_rootx(), root.winfo_pointery() - root.winfo_rooty()
        target_x, target_y = mouse_x, mouse_y
    else:
        # Generate a new target point every TARGET_INTERVAL seconds
        if target_point is None or (current_time - last_target_time) >= TARGET_INTERVAL:
            generate_random_target()
            last_target_time = current_time
        target_x, target_y = target_point

    # Update the head position
    head_x, head_y = fish_positions[0]
    dx = target_x - head_x
    dy = target_y - head_y
    distance = math.hypot(dx, dy)

    if distance > 0:
        # Move the head towards the target position
        move_x = dx / distance * min(distance, SEGMENT_LENGTH)
        move_y = dy / distance * min(distance, SEGMENT_LENGTH)
        fish_positions[0] = (head_x + move_x, head_y + move_y)

    # Update positions of the rest of the segments
    for i in range(1, NUM_SEGMENTS):
        prev_x, prev_y = fish_positions[i - 1]
        curr_x, curr_y = fish_positions[i]
        dx = prev_x - curr_x
        dy = prev_y - curr_y
        distance = math.hypot(dx, dy)

        if distance > 0:
            # Calculate the amount to move
            move_distance = distance - SEGMENT_LENGTH
            move_x = dx / distance * move_distance
            move_y = dy / distance * move_distance
            # Update position to maintain the fixed segment length
            fish_positions[i] = (curr_x + move_x, curr_y + move_y)

def generate_random_target():
    global target_point
    cell_width = 10
    cell_height = 20
    canvas_width = canvas.winfo_width()
    canvas_height = canvas.winfo_height()
    cols = canvas_width // cell_width
    rows = canvas_height // cell_height

    # Randomly select a cell
    col = random.randint(0, cols - 1)
    row = random.randint(0, rows - 1)
    # Calculate the center position of the cell
    cell_x = col * cell_width + cell_width // 2
    cell_y = row * cell_height + cell_height // 2

    target_point = (cell_x, cell_y)

def mouse_click(event):
    global follow_cursor, target_point, last_target_time
    # Toggle between follow cursor mode and random target mode
    follow_cursor = not follow_cursor
    if not follow_cursor:
        # Switched to random target mode
        target_point = None  # Will be generated in update_fish_positions()
        last_target_time = time.time() - TARGET_INTERVAL  # Force immediate target generation
    else:
        # Switched back to follow cursor mode
        target_point = None

    # Add a ripple at the click position
    ripple = {
        'x': event.x,
        'y': event.y,
        'time': time.time(),
        'wavelength': 50,   # Adjust for wavelength
        'speed': 100,        # Speed of the ripple expansion (pixels per second)
        'thickness': 50,    # Thickness of the ripple wavefront
        'height': 1,        # Height of the wave (affects amplitude)
    }
    ripples.append(ripple)

# Create the main window
root = tk.Tk()
root.title("ASCII Ripple with Fish")
canvas_width = 800
canvas_height = 600
root.geometry(f"{canvas_width}x{canvas_height}")

# Create a canvas to draw on
canvas = tk.Canvas(root, width=canvas_width, height=canvas_height)
canvas.pack(fill=tk.BOTH, expand=True)
canvas.configure(background='lightblue')

# Bind the mouse click to the ripple function
canvas.bind('<Button-1>', mouse_click)

# Initialize fish positions and sizes
initialize_fish()

# Start the animation
update_canvas()

# Start the Tkinter event loop
root.mainloop()
