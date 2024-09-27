class LRUcache
{
    public static void main(String []args)
    {
    
    	public interface Cache<K, V> {
	    boolean set(K key, V value);
	    Optional<V> get(K key);
	    int size();
	    boolean isEmpty();
	    void clear();
	}

	public class LRUCache<K, V> implements Cache<K, V> {
	    private int size;
	    private Map<K, LinkedListNode<CacheElement<K,V>>> linkedListNodeMap;
	    private DoublyLinkedList<CacheElement<K,V>> doublyLinkedList;

	    public LRUCache(int size) {
		this.size = size;
		this.linkedListNodeMap = new HashMap<>(maxSize);
		this.doublyLinkedList = new DoublyLinkedList<>();
	    }
	}

	public boolean put(K key, V value) {
	    CacheElement<K, V> item = new CacheElement<K, V>(key, value);
	    LinkedListNode<CacheElement<K, V>> newNode;
	    if (this.linkedListNodeMap.containsKey(key)) {
		LinkedListNode<CacheElement<K, V>> node = this.linkedListNodeMap.get(key);
		newNode = doublyLinkedList.updateAndMoveToFront(node, item);
	    } else {
		if (this.size() >= this.size) {
		    this.evictElement();
		}
		newNode = this.doublyLinkedList.add(item);
	    }
	    if(newNode.isEmpty()) {
		return false;
	    }
	    this.linkedListNodeMap.put(key, newNode);
	    return true;
	}

	public LinkedListNode<T> updateAndMoveToFront(LinkedListNode<T> node, T newValue) {
	    if (node.isEmpty() || (this != (node.getListReference()))) {
		return dummyNode;
	    }
	    detach(node);
	    add(newValue);
	    return head;
	}

	public Optional<V> get(K key) {
	   LinkedListNode<CacheElement<K, V>> linkedListNode = this.linkedListNodeMap.get(key);
	   if(linkedListNode != null && !linkedListNode.isEmpty()) {
	       linkedListNodeMap.put(key, this.doublyLinkedList.moveToFront(linkedListNode));
	       return Optional.of(linkedListNode.getElement().getValue());
	   }
	   return Optional.empty();
	}

	public LinkedListNode<T> moveToFront(LinkedListNode<T> node) {
	    return node.isEmpty() ? dummyNode : updateAndMoveToFront(node, node.getElement());
	}

	@Test
	public void addSomeDataToCache_WhenGetData_ThenIsEqualWithCacheElement(){
	    LRUCache<String,String> lruCache = new LRUCache<>(3);
	    lruCache.put("1","test1");
	    lruCache.put("2","test2");
	    lruCache.put("3","test3");
	    assertEquals("test1",lruCache.get("1").get());
	    assertEquals("test2",lruCache.get("2").get());
	    assertEquals("test3",lruCache.get("3").get());
	}

	@Test
	public void addDataToCacheToTheNumberOfSize_WhenAddOneMoreData_ThenLeastRecentlyDataWillEvict(){
	    LRUCache<String,String> lruCache = new LRUCache<>(3);
	    lruCache.put("1","test1");
	    lruCache.put("2","test2");
	    lruCache.put("3","test3");
	    lruCache.put("4","test4");
	    assertFalse(lruCache.get("1").isPresent());
	}

	public class LRUCache<K, V> implements Cache<K, V> {
	    private int size;
	    private final Map<K, LinkedListNode<CacheElement<K,V>>> linkedListNodeMap;
	    private final DoublyLinkedList<CacheElement<K,V>> doublyLinkedList;
	    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();

	    public LRUCache(int size) {
		this.size = size;
		this.linkedListNodeMap = new ConcurrentHashMap<>(size);
		this.doublyLinkedList = new DoublyLinkedList<>();
	    }
	}

	public boolean put(K key, V value) {
	  this.lock.writeLock().lock();
	   try {
	   } finally {
	       this.lock.writeLock().unlock();
	   }
	}

	private boolean evictElement() {
	    this.lock.writeLock().lock();
	    try {
	    } finally {
		this.lock.writeLock().unlock();
	    }
	}

	public Optional<V> get(K key) {
	    this.lock.readLock().lock();
	    try {
		//...
	    } finally {
		this.lock.readLock().unlock();
	    }
	}

	@Test
	public void runMultiThreadTask_WhenPutDataInConcurrentToCache_ThenNoDataLost() throws Exception {
	    final int size = 50;
	    final ExecutorService executorService = Executors.newFixedThreadPool(5);
	    Cache<Integer, String> cache = new LRUCache<>(size);
	    CountDownLatch countDownLatch = new CountDownLatch(size);
	    try {
		IntStream.range(0, size).<Runnable>mapToObj(key -> () -> {
		    cache.put(key, "value" + key);
		    countDownLatch.countDown();
	       }).forEach(executorService::submit);
	       countDownLatch.await();
	    } finally {
		executorService.shutdown();
	    }
	    assertEquals(cache.size(), size);
	    IntStream.range(0, size).forEach(i -> assertEquals("value" + i,cache.get(i).get()));
	}


    }
};





