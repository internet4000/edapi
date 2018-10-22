#!/bin/bash

for x in 1 2 3 4 5 6 7 8 9 10
	do
		curl -s https://edapi.glitch.me/releases/6980600 -o /dev/null -w "\n %{time_total}"
done
