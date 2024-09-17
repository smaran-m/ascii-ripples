import tkinter as tk
import time
import math

# List to keep track of active ripples
ripples = []

def amplitude_to_color(amplitude):
    # Normalize amplitude
    # acceptable value between 127 and 255
    color_value = int((amplitude + 1) / 2 * 255)
    color_value = max(127, min(255, color_value))

    # todo: style the color, currently greyscale
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

    #char_set = " ░▒▓█"
    char_set = "-∘◦•○◎◍●◉⬤"
    #char_set = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\|()1{}[]?-_+~<>i!lI;:,\"^`'. "[::-1]

    # max amplitude for normalization (adjust as needed)
    max_amplitude = 2  # haven't tested higher values, but should work

    # ascii cells
    for col in range(cols):
        for row in range(rows):
            cell_x = col * cell_width + cell_width // 2
            cell_y = row * cell_height + cell_height // 2

            total_amplitude = 0  # init amplitude

            for ripple in ripples:
                dx = cell_x - ripple['x']
                dy = cell_y - ripple['y']
                distance = math.hypot(dx, dy)
                elapsed = current_time - ripple['time']

                # parameters
                wave_count = ripple['wave_count']    # Number of waves in the ripple
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
            index = int(normalized_amplitude * (len(char_set) - 1))
            index = max(0, min(len(char_set) - 1, index))  # Clamp index to valid range
            char = char_set[index]

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

def mouse_click(event):
    # Add a new ripple source at the click position
    ripple = {
        'x': event.x,
        'y': event.y,
        'time': time.time(),
        'wavelength': 50,   # Adjust for wave length
        'speed': 100,        # Speed of the ripple expansion (pixels per second)
        'thickness': 50,    # Thickness of the ripple wavefront
        'height': 1,        # Height of the wave (affects amplitude)
        'wave_count': 10    # Number of waves in the ripple (not used here but kept for consistency)
    }
    ripples.append(ripple)

# Create the main window
root = tk.Tk()
root.title("acsii ripple")
root.geometry("400x400")

# Create a canvas to draw on
canvas = tk.Canvas(root, width=400, height=400)
canvas.pack(fill=tk.BOTH, expand=True)
canvas.configure(background='lightblue')


# Bind the mouse click to the ripple function
canvas.bind('<Button-1>', mouse_click)

# Start the animation
update_canvas()

# Start the Tkinter event loop
root.mainloop()
