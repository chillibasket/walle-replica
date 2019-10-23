/* * * * * * * * * * * * * * * * * * * * * * *
 * GENERIC QUEUE CLASS
 * Ring Buffer, for use as FIFO or LIFO queue
 *
 * Code by:  Simon B.
 * Email:    hello@chillibasket.com
 * * * * * * * * * * * * * * * * * * * * * * */

#ifndef QUEUE_HPP
#define QUEUE_HPP


/* Uncomment next line to allow size of queue to be dynamically increased */
//#define DYNAMIC_SIZE


// QUEUE CLASS DEFINITION
template<class T>
class Queue {

public:
	// Default Constructor
	Queue() {
		Queue(256);
	}

	Queue(int max) {
		qFront = 0;
		qBack = 0;
		qSize = 0;
		maxSize = max;
		qData = new T[max];   
	};

	// Default destructor
	~Queue() {
		delete[] qData;
	};

	// Manipulation Functions
	void push(const T &item);
	T pop();
	T pop_back();
	T front();
	T peek();
	T back();

	// Management Functions
	bool empty();
	inline int size();
	void clear();

	

private:
	int qFront, qBack, qSize, maxSize;
	T *qData;
};



/*
 * \func  int Queue<T>::size()
 * \desc  Return the size of the queue
 */
template<class T> inline int Queue<T>::size() {
	return qSize;
}


/*
 * \func  void Queue<T>::push(const T &item)
 * \desc  Add an item onto the qBack of the queue
 * \para  (&item) Contents of item, passed by reference
 */
template<class T> void Queue<T>::push(const T &item) {
	// Check if there is space
	if(qSize < maxSize) {
		// Add item to the queue
		qData[qBack++] = item;
		qSize++;

		// Ensure circular buffer wraps around
		if (qBack >= maxSize) qBack -= maxSize;
	}

#ifdef DYNAMIC_SIZE
	// If queue can dynamically allocate more memory, increase size of queue
	else {
		// Create a queue which is twice the size
		T *newQueue = new T[maxSize*2];
		qSize = 0;

		// Fill the new queue with the data from the old one
		do {
			newQueue[qSize++] = qData[qFront++];
			if (qFront >= maxSize) qFront -= maxSize;
		} while (qFront != qBack);

		// Update integer variables
		qFront = 0;
		qBack = qSize;
		maxSize = maxSize*2;

		// Delete the old queue and transfer the new one into its place
		delete[] qData;
		qData = newQueue;

		// Add the new item
		push(item);
	}
#endif /* DYNAMIC_SIZE */
}


/*
 * \func  T Queue<T>::pop() 
 * \desc  Pop the oldest item off the front of the queue
 * \retu  The item at the front of the queue
 */
template<class T> T Queue<T>::pop() {
	// If queue is empty, return an empty item
	if(qSize <= 0) return T();
	
	// Otherwise, retreive item from front of queue
	else {
		T result = qData[qFront];
		qFront++;
		qSize--;

		// Ensure circular buffer wraps around
		if (qFront >= maxSize) qFront -= maxSize;
		return result;
	} 
}


/*
 * \func  T Queue<T>::pop_back() 
 * \desc  Pop the newest item off the back of the queue
 * \retu  The item at the back of the queue
 */
template<class T> T Queue<T>::pop_back() {
	// If queue is empty, return an empty item
	if(qSize <= 0) return T();
	
	// Otherwise, retreive item from back of queue
	else {
		int item = qBack - 1;
		if (item < 0) item += maxSize;

		T result = qData[item];
		qBack--;
		qSize--;

		// Ensure circular buffer wraps around
		if (qBack < 0) qBack += maxSize;
		return result;
	} 
}


/*
 * \func  T Queue<T>::front() 
 * \desc  Return the item at the front of the queue
 */
template<class T> T Queue<T>::front() {
	if(qSize <= 0) return T();
	else return qData[qFront];
}

// "peek" is the same as "front"
template<class T> T Queue<T>::peek() {
	return front();
}


/*
 * \func  T Queue<T>::back() 
 * \desc  Return the item at the back of the queue
 */
template<class T> T Queue<T>::back() {
	if(qSize <= 0) return T();
	else {
		int item = qBack - 1;
		if (item < 0) item += maxSize;
		return qData[item];
	}
}


/*
 * \func  bool Queue<T>::empty() 
 * \desc  Returns true if the queue is empty
 */
template<class T> bool Queue<T>::empty() {
	if (qSize <= 0) return true;
	return false;
}


/*
 * \func  void Queue<T>::clear() 
 * \desc  Clear all items from the queue
 */
template<class T> void Queue<T>::clear() {
	qFront = qBack;
	qSize = 0;
}

#endif /* QUEUE_HPP */
